import { createWorker, OEM, PSM } from "tesseract.js";
const MODES = {
  auto: PSM.AUTO,
  block: PSM.SINGLE_BLOCK,
  sparse: PSM.SPARSE_TEXT,
  line: PSM.SINGLE_LINE,
};

// Intentionally OEM 0: the classic recognizer, never LSTM or an auto fallback.
// Paths are all packaged extension resources; CSP denies external connections.
export class OcrEngine {
  worker = null;
  epoch = 0;
  busy = false;
  onProgress;
  rejectPending = null;
  constructor(onProgress = () => {}) {
    this.onProgress = onProgress;
  }
  async recognize(canvas, settings) {
    if (this.busy) throw new Error("Recognition is already running.");
    this.busy = true;
    const epoch = ++this.epoch;
    const base = new URL(".", location.href);
    let timer;
    const cancelled = new Promise((_, reject) => {
      this.rejectPending = reject;
    });
    const work = async () => {
      const worker = await createWorker("eng", OEM.TESSERACT_ONLY, {
        workerPath: new URL("vendor/worker.min.js", base).href,
        corePath: new URL("vendor/core/", base).href,
        langPath: new URL("vendor/lang/", base).href.replace(/\/$/, ""),
        workerBlobURL: false,
        legacyCore: true,
        legacyLang: true,
        gzip: true,
        cacheMethod: "none",
        logger: (message) => {
          if (epoch === this.epoch) this.onProgress(message);
        },
        errorHandler: (error) => {
          if (epoch === this.epoch)
            this.rejectPending?.(
              new Error(
                typeof error === "string"
                  ? error
                  : "The local OCR worker stopped unexpectedly.",
              ),
            );
        },
      });
      if (epoch !== this.epoch) {
        await worker.terminate();
        throw new Error("Recognition cancelled.");
      }
      this.worker = worker;
      await worker.setParameters({
        tessedit_pageseg_mode: MODES[settings.segmentation] || PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const { data } = await worker.recognize(
        canvas,
        {},
        { text: true, blocks: true, tsv: true },
      );
      return data;
    };
    try {
      timer = setTimeout(
        () =>
          this.rejectPending?.(
            new Error(
              "Recognition timed out after 120 seconds. Crop a smaller area or turn off image enhancement.",
            ),
          ),
        120_000,
      );
      return await Promise.race([work(), cancelled]);
    } finally {
      clearTimeout(timer);
      if (epoch === this.epoch) {
        this.epoch++;
        this.busy = false;
        this.rejectPending = null;
        const worker = this.worker;
        this.worker = null;
        await worker?.terminate();
      }
    }
  }
  cancel() {
    this.rejectPending?.(new Error("Recognition cancelled."));
    this.epoch++;
    this.busy = false;
    this.rejectPending = null;
    const worker = this.worker;
    this.worker = null;
    void worker?.terminate();
  }
}
