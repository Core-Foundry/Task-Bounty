"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import ConnectWalletButton from "./ConnectWalletButton";
import Image from "next/image";

const NAV_ITEMS = [
  { name: "Overview", href: "/user/overview" },
  { name: "Groups", href: "/groups" },
  { name: "Fundraising", href: "/fundraising" },
  { name: "Transactions", href: "/user/transactions" },
  { name: "Completed Tasks", href: "/completed-tasks" },
  { name: "Profile Analytics", href: "#" },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close menu when a nav item is clicked
  const handleNavItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-lg border-b border-white/5 flex items-center justify-between py-[14px] lg:py-5 px-3 lg:px-[100px]">
      {/* Logo */}
      <div className="flex items-center gap-[7px] py-1 pr-3 px-2 rounded-full border-[#232542] border-[1px]">
        <div className="relative w-9 h-9 lg:w-12 lg:h-12 overflow-hidden rounded-full border border-white/10">
          <Image
            src="/logo.jpeg"
            alt="Paymesh Logo"
            fill
            className="object-cover"
          />
        </div>
        <span className="text-2xl/[100%] lg:text-[28px]/12 font-bold text-white tracking-wide font-anton">
          PAYMESH
        </span>
      </div>

      {/* Desktop Menu - Centered Pill */}
      <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
        <div className="flex items-center p-1.5 bg-[#0D0D10] border border-[#232542] rounded-full">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`px-6 py-[15px] rounded-full text-[#dddddd] text-xs font-black tracking-[0] uppercase transition-colors ${
                item.name === "Overview" ? "bg-[#5B63D6]" : "hover:bg-[#5B63D6]"
              }`}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>

      {/* Connect Button (Desktop) */}
      <div className="hidden md:block">
        <ConnectWalletButton />
      </div>

      {/* Mobile menu button */}
      <div className="flex md:hidden items-center gap-3">
        <ConnectWalletButton />
        <button
          type="button"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="inline-flex items-center justify-center p-3 rounded-full text-[#E2E2E2] bg-[#101011] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92F2FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070A11]"
          className="inline-flex items-center justify-center p-3 rounded-full text-[#E2E2E2] bg-[#101011] focus:outline-none focus:ring-2 focus:ring-[#5B63D6] focus:ring-offset-2 focus:ring-offset-[#0D0D10]"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`absolute top-full left-0 right-0 mt-2 mx-3 p-4 bg-[#0D0D10] border border-[#232542] rounded-2xl shadow-xl z-50 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={handleNavItemClick}
              className={`px-4 py-3 rounded-xl text-[#dddddd] text-sm font-bold tracking-wide transition-colors ${
                item.name === "Overview"
                  ? "bg-[#5B63D6] text-white"
                  : "hover:bg-[#5B63D6]/20"
              }`}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
