import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShow } from "@/contexts/ShowContext";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { B2CRegistrationDialog } from "./B2CRegistrationDialog";
import { useTranslation } from "react-i18next";

export const B2CLandingNavigation = () => {
  const { t } = useTranslation();
  const { show, branding } = useShow();
  const { isScrolled } = useScrollPosition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [initialStep, setInitialStep] = useState<"register" | "login">("register");

  const navLinks = [
    { href: "#about", label: t('pages.about') },
    { href: "#how-it-works", label: t('pages.howItWorks') },
    { href: "#participants", label: t('pages.participants') },
    { href: "#rules", label: t('pages.GameRules') },
    { href: "#faq", label: t('pages.FAQ') },
  ];

  // Close menu on scroll
  useEffect(() => {
    if (isScrolled && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isScrolled]);

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  const handleOpenDialog = (step: "register" | "login") => {
    setInitialStep(step);
    setShowRegistration(true);
    setIsMenuOpen(false);
  };

  const logoUrl = branding?.logo_url;

  return (
    <>
      {/* Fixed header bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
          isScrolled || isMenuOpen
            ? "bg-black/70 backdrop-blur-lg shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">

            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-3 flex-shrink-0"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={show?.name || "Show"}
                  className="h-8 md:h-10 w-auto"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {show?.name || "Fantasy Game"}
                </span>
              )}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-white/80 hover:text-white transition-colors text-sm font-medium relative group"
                >
                  {link.label}
                  <span
                    className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full"
                    style={{ backgroundColor: "var(--show-primary)" }}
                  />
                </button>
              ))}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => handleOpenDialog("login")}
                className="text-white/80 border border-white/20 hover:text-white hover:bg-white/10"
              >
                {t('auth.login')}
              </Button>
              <Button
                onClick={() => handleOpenDialog("register")}
                className="text-white font-semibold"
                style={{
                  background: `linear-gradient(135deg, var(--show-primary), var(--show-secondary))`,
                }}
              >
                {t('auth.register')}
              </Button>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 text-white rounded-md hover:bg-white/10 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — full screen overlay, sits below header */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Slide-down panel */}
        <div
          className={`absolute top-16 left-0 right-0 bg-black/90 backdrop-blur-lg border-b border-white/10 transition-transform duration-300 ${
            isMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {/* Nav links */}
          <nav className="flex flex-col divide-y divide-white/10">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="w-full text-left px-6 py-4 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="flex gap-3 px-6 py-5 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => handleOpenDialog("login")}
              className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10 h-11"
            >
              {t('auth.login')}
            </Button>
            <Button
              onClick={() => handleOpenDialog("register")}
              className="flex-1 text-white font-semibold h-11"
              style={{
                background: `linear-gradient(135deg, var(--show-primary), var(--show-secondary))`,
              }}
            >
              {t('auth.register')}
            </Button>
          </div>
        </div>
      </div>

      <B2CRegistrationDialog
        open={showRegistration}
        onOpenChange={setShowRegistration}
        initialStep={initialStep}
      />
    </>
  );
};
