import type { Metadata, Viewport } from "next";
import { Baloo_Chettan_2, Exo_2 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "./service-worker-registration";

// Site-wide font, used for both body text and headings (via --font-sans /
// --font-heading) — Baloo Chettan 2 stays paired in as a Malayalam-script
// fallback so bilingual leaderboard content still renders in a matching
// weight/style instead of falling back to a generic system font (Exo 2
// itself has no Malayalam glyphs).
const exo2 = Exo_2({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const balooChettan = Baloo_Chettan_2({
  variable: "--font-baloo-chettan",
  subsets: ["malayalam", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Fiestify",
    template: "%s — Fiestify",
  },
  description:
    "Run a festival end to end — groups, students, programs, judging and live results.",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${exo2.variable} ${balooChettan.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD@100..700,0..1,-25..200&display=swap"
          rel="stylesheet"
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":true;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
