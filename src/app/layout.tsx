import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

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
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorBackground: "#212126",
          colorNeutral: "white",
          colorPrimary: "#ffffff",
          colorPrimaryForeground: "black",
          colorForeground: "white",
          colorInputForeground: "white",
          colorInput: "#26262B",
        },
        elements: {
          providerIcon__github: { filter: "invert(1)" },
          providerIcon__apple: { filter: "invert(1)" },
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${geist.className} bg-background text-foreground min-h-screen`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
