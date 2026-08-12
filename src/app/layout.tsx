import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Newsreader } from "next/font/google";
import { SITE } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Newsreader carries the letter itself. A serif is what makes prose read as
 * correspondence rather than as product marketing, and this one holds up at
 * text sizes on a dark background — high-contrast serifs go spindly there.
 * The interface (buttons, form, tables, nav) stays in the sans.
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

/** Used for exactly one thing: the signed name at the end of the letter. */
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

// Colombia, not Cali. Cali belongs to the founder's story, but the campaign
// supports affected communities nationwide and the metadata is what gets
// quoted when the link is shared.
const title = "DonaOnchain — help Colombia after the earthquake";
const description =
  "A Colombian onchain builder asking the crypto community to help Colombia after the magnitude 7.4 earthquake of 10 August 2026. Donate in USDC or USDT across five networks. ReFi Colombia receives and manages the funds, and every donation is publicly verifiable onchain.";

/**
 * Share card.
 *
 * 1200×630 is the size every platform crops from, and the file is kept a long
 * way under 600 KB because WhatsApp simply does not fetch previews above that
 * — which matters more than usual for a campaign that will be forwarded in
 * Colombia. It is a JPEG for the same reason; the artwork has no transparency
 * to preserve.
 *
 * `alt` is not decoration here: it is what screen readers and some clients
 * announce in place of the card.
 */
const ogImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "We Stand With Colombia — onchain donations to support Colombia. donaonchain.com",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: title, template: "%s · DonaOnchain" },
  description,
  applicationName: SITE.name,
  authors: [{ name: "Camilo Sacanamboy", url: "https://x.com/camilosaka" }],
  creator: "Camilo Sacanamboy",
  publisher: SITE.name,
  keywords: [
    "Colombia earthquake",
    "terremoto Colombia",
    "crypto donations",
    "donaciones cripto",
    "USDC",
    "ReFi Colombia",
    "onchain donations",
  ],
  alternates: { canonical: SITE.url },
  openGraph: {
    title,
    description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    // Both locales are served from one URL by a client-side toggle, so the
    // card declares the default and lists the alternate rather than pointing
    // at a separate Spanish page that does not exist.
    locale: "en_US",
    alternateLocale: ["es_CO"],
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@camilosaka",
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-fg">{children}</body>
    </html>
  );
}
