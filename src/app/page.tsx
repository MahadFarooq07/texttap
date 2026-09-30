"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Command,
  Copy,
  FileText,
  ImageIcon,
  LockKeyhole,
  Menu,
  Monitor,
  MousePointer2,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import type { Worker } from "tesseract.js";

const samples = [
  {
    label: "Images",
    icon: ImageIcon,
    file: "a little inspiration.png",
    title: "Stay curious.",
    subtitle: "Make something wonderful.",
    text: "Stay curious.\nMake something wonderful.",
    tag: "A NOTE TO YOURSELF",
    foot: "GOOD THINGS START WITH A LITTLE CURIOSITY.",
  },
  {
    label: "Videos",
    icon: Video,
    file: "design, in a few words.mp4",
    title: "Less, but better.",
    subtitle: "Leave room for what matters.",
    text: "Less, but better.\nLeave room for what matters.",
    tag: "THE DESIGN SERIES · 01",
    foot: "A SMALL IDEA. A DIFFERENT PERSPECTIVE.",
  },
  {
    label: "PDFs",
    icon: FileText,
    file: "the creative brief.pdf",
    title: "Ideas come first.",
    subtitle: "The details make the difference.",
    text: "Ideas come first.\nThe details make the difference.",
    tag: "THE CREATIVE BRIEF",
    foot: "CHAPTER 01 — START WITH SOMETHING SIMPLE.",
  },
];

const faqs = [
  [
    "What is TextTap?",
    "TextTap is a free Chrome extension that captures text from images and webpages. Select an area or image, review the OCR result, and copy cleanly formatted text. Recognition runs on your device.",
  ],
  [
    "Can I try it without downloading anything?",
    "Absolutely. Choose Try TextTap, then drop in a PNG, JPG, or WebP image. The demo reads English text right in your browser. You can edit the result and copy it to your clipboard.",
  ],
  [
    "Do my images leave my device?",
    "No. Image recognition happens locally in your browser. The demo downloads its recognition engine and English language data on first use, but your images and extracted text are never uploaded to a server.",
  ],
  [
    "What about videos and PDFs?",
    "Capture a frame or page as an image, then scan that image. The extension also accepts image files and screenshots.",
  ],
  [
    "How do I install TextTap?",
    "Download the extension ZIP, unzip it, then open chrome://extensions, enable Developer mode, and choose Load unpacked. Select the unzipped folder. The extension works offline after installation.",
  ],
];

function Logo({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`app-icon ${large ? "app-icon-large" : ""}`}
      aria-hidden="true"
    >
      <ScanLine strokeWidth={1.65} />
      <span>T</span>
    </span>
  );
}

async function copyText(text: string) {
  if (!navigator.clipboard)
    throw new Error(
      "Clipboard access is unavailable. Please select and copy the text manually.",
    );
  await navigator.clipboard.writeText(text);
}

function ProductDemo({
  openTry,
  playSignal,
}: {
  openTry: () => void;
  playSignal: number;
}) {
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<"ready" | "scanning" | "done">("ready");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sample = samples[active];

  const capture = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("scanning");
    setCopied(false);
    setCopyError("");
    timer.current = setTimeout(() => setPhase("done"), 1500);
  }, []);

  useEffect(() => {
    if (playSignal > 0) capture();
  }, [playSignal, capture]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function selectSample(index: number) {
    if (timer.current) clearTimeout(timer.current);
    setActive(index);
    setPhase("ready");
    setCopied(false);
    setCopyError("");
  }

  async function copySample() {
    try {
      await copyText(sample.text);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Select the text above and copy it manually.");
    }
  }

  return (
    <div className="demo-wrap" id="demo">
      <div
        className={`desktop-demo phase-${phase}`}
        role="tabpanel"
        id="sample-panel"
        aria-labelledby={`sample-tab-${active}`}
      >
        <div className="desktop-bar">
          <div>
            <Logo />
            <strong>TextTap</strong>
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
          </div>
          <div>
            <Monitor size={13} />
            <span>Tue 9:41 AM</span>
          </div>
        </div>
        <div className="desktop-grain" />
        <div className="source-window">
          <div className="window-bar">
            <span className="traffic-lights">
              <i />
              <i />
              <i />
            </span>
            <span>{sample.file}</span>
            <span className="window-tools">
              <ImageIcon size={14} />
              <ChevronDown size={12} />
            </span>
          </div>
          <div className={`sample-art sample-${active}`}>
            <span className="sample-eyebrow">{sample.tag}</span>
            <div className="sample-words">
              <h3>{sample.title}</h3>
              <p>{sample.subtitle}</p>
              <div className="selection-frame">
                <i />
                <i />
                <i />
                <i />
                <div className="scan-beam" />
              </div>
              <MousePointer2
                className="demo-cursor"
                fill="white"
                strokeWidth={1.4}
              />
            </div>
            <span className="sample-footnote">{sample.foot}</span>
            {active === 1 && (
              <div className="video-timeline">
                <Play size={12} fill="currentColor" />
                <span />
                <small>00:12 / 02:48</small>
              </div>
            )}
            {active === 2 && <span className="pdf-page">1 / 8</span>}
          </div>
        </div>
        <div className="capture-label">
          <ScanLine size={14} />{" "}
          {phase === "scanning"
            ? "Finding a little magic…"
            : phase === "done"
              ? "Just like that. It’s yours."
              : "Text that used to be out of reach."}
        </div>
        <div
          className={`result-window ${phase === "done" ? "is-captured" : ""}`}
        >
          <div className="result-header">
            <span className="result-icon">
              <ScanLine size={16} />
            </span>
            <strong>Text, untapped.</strong>
            <span className="result-status">
              <span />
              {phase === "scanning" ? "Reading" : "Ready"}
            </span>
          </div>
          <div className="result-body" aria-live="polite">
            {phase === "scanning" ? (
              <div className="skeleton-lines">
                <i />
                <i />
                <i />
              </div>
            ) : (
              <>
                <p>
                  {sample.title}
                  <br />
                  {sample.subtitle}
                </p>
                <span>
                  {phase === "done"
                    ? "Captured. Ready for whatever’s next."
                    : "A little preview of your next copy & paste."}
                </span>
              </>
            )}
          </div>
          <button
            className="result-copy"
            onClick={phase === "done" ? copySample : capture}
            disabled={phase === "scanning"}
          >
            {copied ? (
              <Check size={15} />
            ) : phase === "done" ? (
              <Copy size={15} />
            ) : (
              <ScanLine size={15} />
            )}
            {copied
              ? "Copied to clipboard"
              : phase === "done"
                ? "Copy text"
                : phase === "scanning"
                  ? "Capturing…"
                  : "Capture text"}
            <span>{phase === "done" ? "⌘ C" : "↵"}</span>
          </button>
          {copyError && (
            <span className="copy-error" role="alert">
              {copyError}
            </span>
          )}
        </div>
        <div className="floating-shortcut">
          <span className="shortcut-dot">
            <Check size={11} />
          </span>
          <span>No more typing it all out.</span>
          <kbd>⌘</kbd>
          <kbd>C</kbd>
        </div>
        <span className="preview-label">INTERACTIVE PREVIEW</span>
      </div>
      <div className="demo-controls">
        <div className="sample-tabs" role="tablist" aria-label="Preview source">
          {samples.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              role="tab"
              id={`sample-tab-${index}`}
              aria-controls="sample-panel"
              tabIndex={active === index ? 0 : -1}
              aria-selected={active === index}
              onClick={() => selectSample(index)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight")
                  next = (index + 1) % samples.length;
                else if (event.key === "ArrowLeft")
                  next = (index + samples.length - 1) % samples.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = samples.length - 1;
                else return;
                event.preventDefault();
                selectSample(next);
                document.getElementById(`sample-tab-${next}`)?.focus();
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <button className="text-button demo-own" onClick={openTry}>
          Try your own image <span>＋</span>
        </button>
      </div>
    </div>
  );
}

function TryDialog({
  dialogRef,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const running = useRef(false);
  const runId = useRef(0);

  useEffect(
    () => () => {
      runId.current++;
      void workerRef.current?.terminate();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  async function recognize(source: File | string, name: string) {
    if (running.current) return;
    if (
      source instanceof File &&
      (!/^image\/(png|jpeg|webp)$/.test(source.type) ||
        source.size > 15 * 1024 * 1024)
    ) {
      setError("Choose a PNG, JPG, or WebP image smaller than 15 MB.");
      return;
    }
    running.current = true;
    const id = ++runId.current;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = source instanceof File ? URL.createObjectURL(source) : source;
    objectUrl.current = source instanceof File ? url : null;
    setImage(url);
    setFilename(name);
    setText("");
    setError("");
    setCopied(false);
    setStatus("reading");
    setProgress(0);
    let worker: Worker | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (id === runId.current && message.status === "recognizing text")
            setProgress(Math.round(message.progress * 100));
        },
      });
      workerRef.current = worker;
      if (id !== runId.current) return;
      const result = await worker.recognize(source);
      if (id !== runId.current) return;
      if (!result.data.text.trim()) {
        setError(
          "No text found. Try a sharper image with larger, clearly visible text.",
        );
        setStatus("error");
      } else {
        setText(result.data.text.trim());
        setStatus("done");
      }
    } catch {
      if (id === runId.current) {
        setError(
          "We couldn’t read this image. Check your connection so the recognition engine can load, then try another image.",
        );
        setStatus("error");
      }
    } finally {
      await worker?.terminate();
      if (id === runId.current) {
        workerRef.current = null;
        running.current = false;
      }
    }
  }

  function sampleImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f5f0e9";
    context.fillRect(0, 0, 1200, 600);
    context.fillStyle = "#252a30";
    context.font = "bold 78px Georgia";
    context.fillText("Stay curious.", 100, 270);
    context.font = "42px Arial";
    context.fillText("Make something wonderful.", 100, 355);
    void recognize(canvas.toDataURL("image/png"), "a little inspiration.png");
  }

  async function handleCopy() {
    try {
      await copyText(text);
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Clipboard access isn’t available. Select the text and use your keyboard to copy it.",
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="try-dialog"
      aria-labelledby="try-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="dialog-inner">
        <button
          className="close-button"
          aria-label="Close demo"
          onClick={() => dialogRef.current?.close()}
        >
          <X size={20} />
        </button>
        <Logo />
        <span className="eyebrow">THE BROWSER DEMO</span>
        <h2 id="try-title">Your image. Your words.</h2>
        <p className="dialog-description">
          Drop in an image. Take the text with you.
        </p>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose an image"
          disabled={status === "reading"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void recognize(file, file.name);
            event.target.value = "";
          }}
        />
        {!image ? (
          <div
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void recognize(file, file.name);
            }}
          >
            <span className="upload-icon">
              <Upload size={25} />
            </span>
            <strong>Drop your image here</strong>
            <span>PNG, JPG, or WebP · Up to 15 MB</span>
            <button
              className="button button-primary"
              onClick={() => input.current?.click()}
            >
              Choose an image
            </button>
          </div>
        ) : (
          <div className="ocr-workspace">
            <div className="uploaded-preview">
              {/* Local object URL; intentionally no remote image optimizer. */}
              <img src={image} alt={`Image to read: ${filename}`} />
              <span>{filename}</span>
            </div>
            {status === "reading" ? (
              <div className="recognition-progress" role="status">
                <ScanLine size={24} />
                <strong>
                  {progress > 0
                    ? `Reading your image… ${progress}%`
                    : "Getting the magic ready…"}
                </strong>
                <span>
                  {progress > 0
                    ? "Finding the words, one line at a time."
                    : "The first run downloads the recognition engine."}
                </span>
                <progress max="100" value={progress || undefined} />
              </div>
            ) : (
              <div className="extracted-text">
                <label htmlFor="recognized-text">
                  {status === "done"
                    ? "YOUR TEXT, READY TO GO"
                    : "LET’S TRY ANOTHER IMAGE"}
                </label>
                <textarea
                  id="recognized-text"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setCopied(false);
                  }}
                  placeholder="Your extracted text will appear here."
                />
                <div className="ocr-actions">
                  <button
                    className="text-button"
                    onClick={() => input.current?.click()}
                  >
                    <RotateCcw size={14} />
                    New image
                  </button>
                  <button
                    className="button button-primary"
                    disabled={!text.trim()}
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied!" : "Copy text"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="ocr-error">
            {error}
          </p>
        )}
        {!image && (
          <button className="sample-link" onClick={sampleImage}>
            Just looking? Try a sample image <Sparkles size={14} />
          </button>
        )}
        <p className="dialog-privacy">
          <ShieldCheck size={14} />
          Your images stay in your browser. English text supported.
        </p>
      </div>
    </dialog>
  );
}

export default function Home() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);
  const openTry = () => {
    setMenuOpen(false);
    dialogRef.current?.showModal();
  };
  const watchDemo = () => {
    document
      .getElementById("demo")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setPlaySignal((value) => value + 1);
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <nav className="nav-shell" aria-label="Main navigation">
          <a className="brand" href="#" aria-label="TextTap home">
            <Logo />
            <span>TextTap</span>
          </a>
          <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#features" onClick={() => setMenuOpen(false)}>
              The little things
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQs
            </a>
            <a href="/download/" onClick={() => setMenuOpen(false)}>
              Get the extension
            </a>
            <a href="/download/" onClick={() => setMenuOpen(false)}>
              Get the extension
            </a>
          </div>
          <div className="nav-actions">
            <button
              className="button button-small button-dark"
              onClick={openTry}
            >
              Try TextTap <span className="nav-plus">＋</span>
            </button>
            <button
              className="menu-button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <div className="intro-pill">
              <span className="tiny-sparkle">✦</span>A little less retyping. A
              lot more flow.
              <ChevronRight size={13} />
            </div>
            <h1 id="hero-title">
              If you can see it,
              <br />
              you can{" "}
              <span className="headline-accent">
                copy it.
                <svg viewBox="0 0 330 16" aria-hidden="true">
                  <path d="M4 12C79 1 237 1 326 9" />
                </svg>
              </span>
            </h1>
            <p className="hero-description">
              The words you need. Wherever they are.
              <br />
              Lift text out of images, screenshots, and more. Just like magic.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={openTry}>
                <ScanLine size={18} />
                Try TextTap for free
              </button>
              <button className="button button-watch" onClick={watchDemo}>
                <span className="play-icon">
                  <Play size={10} fill="currentColor" />
                </span>
                See it in action
              </button>
            </div>
            <p className="hero-note">
              <Monitor size={13} />
              Chrome extension available<span>·</span>Runs on your device
            </p>
          </div>
          <ProductDemo openTry={openTry} playSignal={playSignal} />
          <div className="benefit-strip">
            <span>
              <Zap size={15} />A shortcut to getting things done
            </span>
            <i />
            <span>
              <LockKeyhole size={15} />
              Your text stays yours
            </span>
            <i />
            <span>
              <Sparkles size={15} />
              Less friction. More flow.
            </span>
          </div>
        </section>

        <section className="how-section section-shell" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">FROM SEEING TO DOING</span>
            <h2>
              Goodbye, retyping.
              <br />
              <span>Hello, copy & paste.</span>
            </h2>
            <p>
              That quote. That slide. That one line you need.
              <br />
              Don’t type it twice. Just tap into it.
            </p>
          </div>
          <div className="steps-grid">
            <article className="step">
              <div className="step-visual step-select">
                <span className="mini-selection">
                  A little inspiration.
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <MousePointer2 size={25} fill="white" />
              </div>
              <div className="step-title">
                <span>01</span>
                <h3>See something good.</h3>
              </div>
              <p>
                A screenshot, a scanned page, or a frame from your favorite
                talk.
              </p>
            </article>
            <article className="step">
              <div className="step-visual step-capture">
                <span className="capture-app">
                  <Logo large />
                </span>
                <span className="mini-toast">
                  <Check size={13} />
                  Text found. Effort saved.
                </span>
              </div>
              <div className="step-title">
                <span>02</span>
                <h3>Let TextTap read it.</h3>
              </div>
              <p>
                Turn pixels into words in a moment. No painstaking
                transcription.
              </p>
            </article>
            <article className="step">
              <div className="step-visual step-paste">
                <div className="mini-note">
                  <div>
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>
                    A little inspiration.
                    <span className="typing-caret" />
                  </p>
                  <i />
                  <i />
                </div>
                <span className="paste-key">⌘ V</span>
              </div>
              <div className="step-title">
                <span>03</span>
                <h3>Make it yours.</h3>
              </div>
              <p>
                Copy your text, paste it where you need it, and get on with your
                day.
              </p>
            </article>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-shell">
            <div className="section-heading feature-heading">
              <span className="eyebrow">SMALL DETAILS. BIG DIFFERENCE.</span>
              <h2>
                A little app.
                <br />
                <span>A lovely little superpower.</span>
              </h2>
            </div>
            <div className="feature-grid">
              <article className="feature-card feature-anywhere">
                <div className="feature-copy">
                  <span className="feature-icon">
                    <ScanLine size={22} />
                  </span>
                  <h3>
                    Words don’t belong
                    <br />
                    behind glass.
                  </h3>
                  <p>
                    From a flash of inspiration to the fine print.
                    <br />
                    Give the text in your images a second life.
                  </p>
                </div>
                <div className="file-stack" aria-hidden="true">
                  <div className="file-tile tile-pdf">
                    <FileText />
                    <span>PDF</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="file-tile tile-image">
                    <ImageIcon />
                    <span>IMG</span>
                    <strong>
                      Hello,
                      <br />
                      possibility.
                    </strong>
                  </div>
                  <div className="file-tile tile-video">
                    <Video />
                    <span>MP4</span>
                    <span className="file-play">
                      <Play size={18} fill="currentColor" />
                    </span>
                  </div>
                  <span className="stack-badge">
                    <Check size={13} />
                    All those words. Unlocked.
                  </span>
                </div>
              </article>
              <article className="feature-card feature-private">
                <div className="privacy-visual" aria-hidden="true">
                  <div className="privacy-orbit orbit-one" />
                  <div className="privacy-orbit orbit-two" />
                  <span className="privacy-lock">
                    <LockKeyhole size={43} strokeWidth={1.5} />
                  </span>
                  <span className="orbit-badge badge-a">
                    <FileText size={19} />
                  </span>
                  <span className="orbit-badge badge-b">
                    <ImageIcon size={19} />
                  </span>
                  <span className="privacy-check">
                    <Check size={14} />
                  </span>
                </div>
                <div className="feature-copy">
                  <span className="privacy-eyebrow">
                    <span />
                    ON YOUR DEVICE. IN YOUR CONTROL.
                  </span>
                  <h3>Private by nature.</h3>
                  <p>
                    Your images stay right in your browser.
                    <br />
                    Your words are nobody’s business but yours.
                  </p>
                </div>
              </article>
              <article className="feature-card feature-simple">
                <div className="feature-copy">
                  <span className="feature-icon">
                    <Zap size={22} />
                  </span>
                  <h3>
                    One less thing
                    <br />
                    between you and done.
                  </h3>
                  <p>
                    No accounts. No busy interface.
                    <br />
                    Just your image, your text, and your next idea.
                  </p>
                </div>
                <div className="keycap-group" aria-hidden="true">
                  <span className="keycap key-command">
                    <Command size={31} />
                    <small>command</small>
                  </span>
                  <span className="keycap key-c">C</span>
                  <span className="key-sparkle">✦</span>
                </div>
              </article>
              <article className="feature-card feature-edit">
                <div className="feature-copy">
                  <span className="feature-icon">
                    <Clipboard size={22} />
                  </span>
                  <h3>
                    A fresh start
                    <br />
                    for every word.
                  </h3>
                  <p>
                    Review it. Refine it. Copy it.
                    <br />
                    Clean, editable text, ready to go anywhere.
                  </p>
                </div>
                <div className="editable-preview">
                  <div className="editable-top">
                    <span className="editable-dot" />
                    Extracted text
                    <Check size={13} />
                  </div>
                  <p>
                    Great ideas start with
                    <br />
                    <mark>a little curiosity.</mark>
                    <span className="typing-caret" />
                  </p>
                  <div className="editable-bottom">
                    <span>Yours to make something of.</span>
                    <Copy size={14} />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="promise-section section-shell">
          <span className="promise-icon">
            <Monitor size={26} strokeWidth={1.3} />
          </span>
          <span className="eyebrow">A LITTLE PREVIEW OF WHAT’S NEXT</span>
          <h2>
            Right at home.
            <br />
            <span>Right on your Mac.</span>
          </h2>
          <p>
            We’re building toward a simple menu bar app.
            <br />A keyboard shortcut. A quick selection. Text, ready to paste.
          </p>
          <div className="mac-preview">
            <div className="mac-menu">
              <span>✦</span>
              <strong>Finder</strong>
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span className="menu-spacer" />
              <ScanLine size={17} />
              <span>Tue 9:41 AM</span>
            </div>
            <div className="menu-popover">
              <div>
                <Logo />
                <strong>TextTap</strong>
                <span>PREVIEW</span>
              </div>
              <div className="menu-option">
                <ScanLine size={15} />
                Capture text<kbd>⇧ ⌘ 2</kbd>
              </div>
              <div className="menu-option">
                <Clipboard size={15} />
                Ready when you are<span>✦</span>
              </div>
              <p>A little utility. A natural part of your day.</p>
            </div>
          </div>
          <span className="coming-soon-label">DESKTOP APP IN THE MAKING</span>
        </section>

        <section className="faq-section section-shell" id="faq">
          <div className="faq-heading">
            <span className="eyebrow">A FEW MORE THINGS</span>
            <h2>Glad you asked.</h2>
            <p>A little clarity before your first tap.</p>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span className="faq-plus">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing-section">
          <Logo large />
          <h2>
            Less typing.
            <br />
            <span>More possibility.</span>
          </h2>
          <p>Your next great copy & paste starts here.</p>
          <button className="button button-primary" onClick={openTry}>
            <ScanLine size={18} />
            Try TextTap for free
          </button>
          <span className="closing-note">
            No download. No account. Just a little magic.
          </span>
        </section>
      </main>
      <footer className="site-footer section-shell">
        <a className="brand" href="#">
          <Logo />
          <span>TextTap</span>
        </a>
        <p>A little less friction. A little more you.</p>
        <span>© {new Date().getFullYear()} TextTap</span>
        <a href="#faq">Questions?</a>
        <a href="#features">Privacy, by design</a>
      </footer>
      <TryDialog dialogRef={dialogRef} />
    </>
  );
}
