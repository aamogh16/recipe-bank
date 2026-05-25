import Nav from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0 md:pl-56">
        <div className="flex-1">{children}</div>
        <footer className="px-6 py-4 text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} RecipeBank · v1.1.0 · made with love by amogh
        </footer>
      </main>
    </div>
  );
}
