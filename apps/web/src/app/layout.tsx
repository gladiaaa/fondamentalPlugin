import type { Metadata } from "next";
import { Sora, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MockingProvider } from "@/mocks/MockingProvider";
import { SessionProvider } from "@/lib/session/SessionContext";
import { Toaster } from "@/components/ui/Toaster";
import { Supervision } from "@/components/layout/Supervision";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Fondamental Plugins",
  description:
    "Plugins Minecraft premium : FondamentalBedwars, FondamentalTag, FondamentalCrate, FondamentalPass.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      // next-themes lit/écrit data-theme après l'hydratation : la balise ne
      // correspond alors plus tout à fait au rendu serveur, sans que ça soit
      // une erreur (voir la doc next-themes).
      suppressHydrationWarning
      className={`${sora.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <MockingProvider>
            <SessionProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </SessionProvider>
          </MockingProvider>
          <Toaster />
          <Supervision />
        </ThemeProvider>
      </body>
    </html>
  );
}
