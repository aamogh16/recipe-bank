import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RecipeBank",
  description: "A personal recipe collection — import from any URL, search by vibe, and cook with confidence.",
  openGraph: {
    title: "RecipeBank",
    description: "A personal recipe collection — import from any URL, search by vibe, and cook with confidence.",
    siteName: "RecipeBank",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecipeBank",
    description: "A personal recipe collection — import from any URL, search by vibe, and cook with confidence.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-background text-foreground min-h-screen`}>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 md:pl-56">
            <div className="flex-1">{children}</div>
            <footer className="px-6 py-4 text-center text-xs text-muted-foreground/40">
              © {new Date().getFullYear()} RecipeBank · v1.0.0 · made with love by amogh
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
