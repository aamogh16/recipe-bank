"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ShoppingCart, Flame, CalendarDays, CalendarRange } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/plan", label: "Plan", icon: CalendarRange },
  { href: "/log", label: "Log", icon: CalendarDays },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/spices", label: "Spices", icon: Flame },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col border-r border-border bg-card px-4 py-6 gap-1">
        <span className="text-lg font-bold tracking-tight px-3 mb-4">RecipeBank</span>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        {/* User account at the bottom of sidebar */}
        <div className="mt-auto px-3 pt-4 border-t border-border">
          <UserButton
            appearance={{ elements: { avatarBox: "w-8 h-8" } }}
            userProfileMode="modal"
          />
        </div>
      </aside>

      {/* Mobile: user button fixed top-right */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <UserButton userProfileMode="modal" />
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card flex">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              pathname === href ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
