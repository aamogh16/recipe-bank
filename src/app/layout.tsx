import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/nav";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RecipeBank",
  description: "Your personal recipe collection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-background text-foreground min-h-screen`}>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 pb-20 md:pb-0 md:pl-56">
            {children}
            <footer className="px-6 py-4 text-center text-xs text-muted-foreground/40 md:pl-56">
              © {new Date().getFullYear()} RecipeBank · v1.0.0 · made with love by amogh
            </footer>
          </main>
        </div>
      </body>
    </html>
  );
}
