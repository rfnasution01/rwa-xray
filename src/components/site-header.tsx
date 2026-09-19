"use client";

import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  const pathname = usePathname();
  const explorerActive =
    pathname === "/assets" || pathname.startsWith("/assets/");
  const issuersActive =
    pathname === "/issuers" || pathname.startsWith("/issuers/");
  const compareActive = pathname === "/compare";
  const methodologyActive = pathname === "/methodology";

  return (
    <header className="relative z-30 border-b border-[#103537]/80 bg-[#02090b]/90 text-[#edf8f6] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#42e8e1]"
          aria-label="RWA X-Ray home"
        >
          <Image
            src="/brand/rwa-xray-mark.png"
            alt=""
            width={42}
            height={42}
            priority
            className="size-10 object-contain drop-shadow-[0_0_12px_rgba(47,232,225,0.45)]"
          />
          <span className="flex items-center gap-2 text-base font-semibold tracking-[0.02em] text-[#edf8f6] sm:text-lg">
            RWA <span className="text-[#50eee7]">X-RAY</span>
          </span>
          <span className="ml-3 hidden border-l border-[#1b4648] pl-5 font-mono text-[8px] leading-4 tracking-[0.24em] text-[#668d8f] uppercase lg:block">
            Real assets.
            <br />
            Real answers.
          </span>
        </Link>

        <nav
          className="flex items-center gap-1 md:gap-4"
          aria-label="Primary navigation"
        >
          <Link
            className={
              explorerActive ? "fx-nav-link fx-nav-link-active" : "fx-nav-link"
            }
            href="/assets"
            aria-current={explorerActive ? "page" : undefined}
          >
            Explorer
          </Link>
          <Link
            className={
              issuersActive
                ? "fx-nav-link fx-nav-link-active hidden sm:inline-flex"
                : "fx-nav-link hidden sm:inline-flex"
            }
            href="/issuers"
            aria-current={issuersActive ? "page" : undefined}
          >
            Issuers
          </Link>
          <Link
            className={
              compareActive
                ? "fx-nav-link fx-nav-link-active hidden sm:inline-flex"
                : "fx-nav-link hidden sm:inline-flex"
            }
            href="/compare"
            aria-current={compareActive ? "page" : undefined}
          >
            Compare
          </Link>
          <Link
            className={
              methodologyActive
                ? "fx-nav-link fx-nav-link-active hidden md:inline-flex"
                : "fx-nav-link hidden md:inline-flex"
            }
            href="/methodology"
            aria-current={methodologyActive ? "page" : undefined}
          >
            Methodology
          </Link>
          <Link className="fx-header-cta ml-2" href="/#demo">
            <span className="hidden sm:inline">Get started</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
