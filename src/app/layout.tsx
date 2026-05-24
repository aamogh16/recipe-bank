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
          <main className="flex-1 pb-20 md:pb-0 md:pl-56">{children}</main>
        </div>
      </body>
    </html>
  );
}
