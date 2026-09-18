import { Activity } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">
              RWA X-Ray
            </span>
            <span className="hidden text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase sm:block dark:text-slate-400">
              Market capacity intelligence
            </span>
          </span>
        </Link>
        <nav
          className="flex items-center gap-1 sm:gap-2"
          aria-label="Primary navigation"
        >
          <Link className="nav-link" href="/assets">
            Explorer
          </Link>
          <Link className="nav-link" href="/compare">
            Compare
          </Link>
          <Link className="nav-link hidden sm:inline-flex" href="/methodology">
            Methodology
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
