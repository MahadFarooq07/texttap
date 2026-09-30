import { ArrowDownToLine, ArrowLeft, Check, ImageIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";

const download = "/downloads/texttap-1.0.0.zip";

export default function DownloadPage() {
  return (
    <main className="download-page">
      <nav className="download-nav" aria-label="Main navigation">
        <Link href="/" className="download-brand"><span className="download-mark">T</span> TextTap</Link>
        <Link href="/" className="download-back"><ArrowLeft size={16} /> Back to TextTap</Link>
      </nav>
      <section className="download-hero">
        <div className="download-icon"><ImageIcon size={36} strokeWidth={1.6} /></div>
        <span className="download-kicker">TEXTTAP FOR CHROME</span>
        <h1>Text you can use,<br /><span>right where you see it.</span></h1>
        <p>Select text on a page, scan an image, and copy a clean result. Free, private, and processed on your device.</p>
        <a className="button button-primary download-button" href={download} download>
          <ArrowDownToLine size={19} /> Download for Chrome <span className="download-version">v1.0.0 · ZIP</span>
        </a>
        <div className="download-trust"><span><Check size={15} /> Free to use</span><span><ShieldCheck size={15} /> OCR stays on your device</span><span><Check size={15} /> Works offline after install</span></div>
        <p className="download-note">Chrome 116 or newer · Windows, macOS, or Linux</p>
      </section>
      <section className="install-card" aria-labelledby="install-title">
        <div><span className="download-kicker">UP AND RUNNING IN A MINUTE</span><h2 id="install-title">Install TextTap</h2><p>Chrome lets you install this directly as an unpacked extension. No store account required.</p></div>
        <ol className="install-steps">
          <li><span>1</span><div><strong>Download and unzip</strong><p>Save the ZIP, then extract the <code>texttap-1.0.0</code> folder somewhere you’ll keep it.</p></div></li>
          <li><span>2</span><div><strong>Open Chrome extensions</strong><p>Go to <code>chrome://extensions</code> and switch on <b>Developer mode</b>.</p></div></li>
          <li><span>3</span><div><strong>Load the folder</strong><p>Choose <b>Load unpacked</b> and select the extracted folder containing <code>manifest.json</code>.</p></div></li>
          <li><span>4</span><div><strong>Pin TextTap</strong><p>Open the puzzle-piece menu and pin TextTap. Select an area or image to capture text.</p></div></li>
        </ol>
        <a className="button button-primary install-download" href={download} download><ArrowDownToLine size={17} /> Download TextTap</a>
      </section>
      <footer className="download-footer"><Link href="/">TextTap</Link><span>Private by design. Your images stay on your device.</span><a href="https://github.com/MahadFarooq07/texttap" rel="noreferrer">View source on GitHub</a></footer>
    </main>
  );
}
