import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Mark } from "@/components/Mark";
import { SITE_URL, X_URL } from "@/lib/social";

const description = "Paste any Robinhood Chain token and see the red flags in seconds: dev wallet, whales, snipers and contract powers.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Second Look · Token scanner for Robinhood Chain",
  description,
  openGraph: { title: "Second Look", description, siteName: "Second Look" },
  twitter: { card: "summary_large_image", title: "Second Look", description },
};

export const viewport: Viewport = { themeColor: "#0a0a0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div className="backdrop" aria-hidden>
          <div className="grid" />
          <div className="lens" />
        </div>
        <header className="top">
          <a href="/" className="brand">
            <Mark />
            <span>Second Look</span>
          </a>
          <nav>
            {X_URL && (
              <a href={X_URL} target="_blank" rel="noreferrer">
                X
              </a>
            )}
            <span className="pill">Robinhood Chain</span>
          </nav>
        </header>
        {children}
        <footer className="foot">
          <span>Second Look · Take a second look before you ape.</span>
          <span>On-chain data from Robinhood Chain. Not financial advice.</span>
        </footer>
      </body>
    </html>
  );
}
