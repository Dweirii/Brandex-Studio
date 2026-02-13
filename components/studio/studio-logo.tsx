"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function StudioLogo() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const getLogoSrc = () => {
    if (!mounted) {
      if (typeof window !== "undefined") {
        const systemPreference = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return systemPreference ? "/Logo-white.png" : "/Logo.png";
      }
      return "/Logo.png";
    }

    const currentTheme = theme === "system" ? systemTheme : theme;
    return currentTheme === "dark" ? "/Logo-white.png" : "/Logo.png";
  };

  const logoSrc = getLogoSrc();

  if (!mounted) {
    return (
      <div
        className="bg-muted/20 animate-pulse transition-all duration-300 rounded-sm w-32 h-8"
        aria-label="Loading logo"
      />
    );
  }

  return (
    <Link href="/" className="flex items-center gap-x-2 relative group">
      <Image
        src={logoSrc}
        width={120}
        height={32}
        alt="Brandex Studio"
        priority
        className="transition-all duration-200 group-hover:opacity-80 h-8 w-auto"
        style={{ width: "auto", height: "auto" }}
      />
      <span className="text-sm font-medium text-muted-foreground">Studio</span>
    </Link>
  );
}
