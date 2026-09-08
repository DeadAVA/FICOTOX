import type { Metadata, Viewport } from "next";
import { Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FICOTOX",
    template: "%s · FICOTOX",
  },
  description: "Sistema de gestión del Laboratorio Nacional de Ficotoxinas (LN-FICOTOX, CICESE).",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f3f6f8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${instrumentSans.variable} ${instrumentSerif.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              fontSize: "13.5px",
              borderRadius: "10px",
              border: "1px solid var(--color-line)",
              boxShadow: "var(--shadow-pop)",
            },
          }}
        />
        <Script src="/vendor/xlsx/xlsx.full.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
