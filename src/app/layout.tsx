import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist_Mono, Manrope, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/shell/cookie-banner";
import { AnalyticsProvider } from "@/components/shell/analytics-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://omni-tool-two.vercel.app"),
  title: {
    default: "ZENODECK — Client-Side Media Suite",
    template: "%s | ZENODECK",
  },
  description:
    "Heavy-duty client-side media engineering suite. Convert video, edit audio, forge documents, record screens, and erase watermarks 100% on-device with WebAssembly. Zero file uploads.",
  applicationName: "ZENODECK",
  keywords: [
    "ZenoDeck",
    "ffmpeg.wasm",
    "client-side media",
    "video converter",
    "audio editor",
    "watermark eraser",
    "screen recorder",
    "WebAssembly media suite",
    "offline video compressor",
    "private audio editor",
  ],
  authors: [{ name: "ZenoDeck Team", url: "https://omni-tool-two.vercel.app" }],
  creator: "ZenoDeck",
  publisher: "ZenoDeck",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ZENODECK — Client-Side Media Suite",
    description:
      "Convert video, edit audio, forge documents, capture your screen and vault the results — 100% locally with WebAssembly. Zero uploads.",
    url: "https://omni-tool-two.vercel.app",
    siteName: "ZENODECK",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "ZENODECK — 100% On-Device WebAssembly Media Suite",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZENODECK — Client-Side Media Suite",
    description:
      "Heavy-duty utility suite powered by WebAssembly. Zero file uploads, total privacy.",
    images: ["/logo.jpg"],
    creator: "@zenodeck",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.jpg", type: "image/jpeg" },
    ],
    apple: [{ url: "/logo.jpg" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0a0813",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = localStorage.getItem('omni_theme_preference');
                var t = p ? JSON.parse(p).state?.theme : null;
                if (t === 'terracotta') {
                  document.documentElement.setAttribute('data-theme', 'terracotta');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${orbitron.variable} ${spaceGrotesk.variable} ${geistMono.variable} ${ebGaramond.variable} ${manrope.variable} antialiased bg-background text-foreground min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]`}
      >
        <AnalyticsProvider />
        {children}
        <CookieBanner />
        <PwaProvider />
        <Toaster />
      </body>
    </html>
  );
}
