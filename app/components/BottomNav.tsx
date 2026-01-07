"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/input", label: "Input" },
  { href: "/finance", label: "Finance" },
  { href: "/career", label: "Karier" },
  { href: "/settings", label: "Lainnya" },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
};

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[color:var(--border)] bg-[color:var(--surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[560px] items-center justify-between px-4 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex flex-1 flex-col items-center gap-1 text-xs transition ${
                active
                  ? "font-semibold text-[color:var(--text)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--text)]"
              }`}
            >
              <span
                className={`h-1 w-6 rounded-full bg-[color:var(--accent)]/80 transition ${
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
