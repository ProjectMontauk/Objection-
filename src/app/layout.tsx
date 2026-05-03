import type { Metadata } from "next";
import {
  DM_Sans,
  Manufacturing_Consent,
  Newsreader,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

const newsreader = Newsreader({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

/** NYT masthead–style blackletter (OFL; Google Fonts name). */
const mastheadWordmark = Manufacturing_Consent({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-masthead-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Citizen Kane — The Verification Desk",
  description:
    "Transcribe an interview and measure how faithfully the press account holds to the record.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${newsreader.variable} ${playfair.variable} ${mastheadWordmark.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-field-muted text-ink">
        {children}
      </body>
    </html>
  );
}
