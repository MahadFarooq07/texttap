import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import "./premium.css";

export const metadata: Metadata = {
  title: "TextTap — See it. Select it. Paste it.",
  description:
    "Capture text from images and webpages with the free TextTap Chrome extension. Private on-device OCR and clean formatted text.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#fafbfc",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
