import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

/*
 * Una sola familia: la del sistema (SF Pro en Apple). Inter es el respaldo
 * para Windows/Linux, con la misma métrica y las mismas variantes.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  themeColor: "#f2f4f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
              fontSize: "13.5px",
              borderRadius: "14px",
              border: "none",
              boxShadow: "var(--shadow-pop)",
            },
          }}
        />
        <Script src="/vendor/xlsx/xlsx.full.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
