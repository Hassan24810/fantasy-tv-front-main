import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import fantasyRealityIcon from "@/assets/fantasy-reality-icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isScrolled } = useScrollPosition();

  const navLinks = [
    { href: "#home", label: t('landing.home') },
    { href: "#features", label: t('landing.features') },
    { href: "#pricing", label: t('landing.pricing') },
    { href: "#faq", label: t('landing.faq') },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-secondary/95 backdrop-blur-lg shadow-lg" 
          : "bg-secondary"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className={`flex items-center justify-between transition-all duration-300 ${
          isScrolled ? "h-14 md:h-16" : "h-16 md:h-20"
        }`}>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={fantasyRealityIcon} 
              alt="Fantasy Reality" 
              className="h-10 md:h-12 w-auto"
            />
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-sm md:text-base text-primary tracking-wide">FANTASY</span>
              <span className="font-display font-bold text-sm md:text-base text-white tracking-wide">REALITY</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-white/70 hover:text-white transition-colors text-sm font-medium relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="gap-2 text-white bg-white/10 hover:bg-white/20"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t('landing.myShows')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="max-w-[120px] truncate">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      {t('landing.myShows')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer">
                      <LogOut className="w-4 h-4" />
                      {t('landing.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  {t('landing.signIn')}
                </Button>
                <Button
                  variant="default"
                  className="bg-gradient-primary hover:opacity-90 transition-opacity"
                  onClick={() => navigate("/auth")}
                >
                  {t('landing.getStarted')}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-white/70 hover:text-white transition-colors text-sm font-medium text-left py-2"
                >
                  {link.label}
                </button>
              ))}
              
              {loading ? (
                <div className="w-full h-10 bg-muted animate-pulse rounded-md" />
              ) : user ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full mt-2 gap-2 text-white bg-white/10 hover:bg-white/20"
                    onClick={() => {
                      navigate("/dashboard");
                      setIsMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t('landing.myShows')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full mt-2 gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" />
                    {t('landing.signOut')}
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  className="bg-gradient-primary hover:opacity-90 transition-opacity w-full mt-2"
                  onClick={() => {
                    navigate("/auth");
                    setIsMenuOpen(false);
                  }}
                >
                  {t('landing.getStarted')}
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
