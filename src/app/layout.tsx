import type { Metadata } from "next";
import { Baloo_Chettan_2, Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Display font pairing (headings, stat numbers, podium/rank text) used
// site-wide via the --font-heading token — Poppins for latin script, Baloo
// Chettan 2 as a Malayalam-script fallback so bilingual leaderboard content
// renders in a matching weight/style instead of falling back to a generic
// system font.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const balooChettan = Baloo_Chettan_2({
  variable: "--font-baloo-chettan",
  subsets: ["malayalam", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mehfile Meem — Festival Management",
  description: "Festival management platform for groups, students, programs, judging and live results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${balooChettan.variable} h-full antialiased`}
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
