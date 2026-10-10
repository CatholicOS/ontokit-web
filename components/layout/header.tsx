"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/editor/ThemeToggle";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navLinks = [
    { href: "/", label: t("projects") },
    { href: "/info", label: t("info") },
    { href: "/docs", label: t("documentation") },
    { href: "/api-docs", label: t("apiReference") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-backdrop-filter:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              OntoKit
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => {
              const isActive = href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "text-sm font-medium transition-colors px-3 py-1.5 rounded-md",
                    isActive
                      ? "bg-blue-100! text-blue-900! dark:bg-blue-900/50! dark:text-blue-100!"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
