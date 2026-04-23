import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut } from "lucide-react";
import logoIcon from "@/assets/fantasy-reality-icon.png";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Feature", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#070B18]/90 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-16">
        <div className="flex items-center h-20 border-b border-white/10">
          {/* Logo - Horizontal layout */}
          <div className="flex items-center gap-3 mr-12">
            <img src={logoIcon} alt="Fantasy Reality" className="h-10 w-10" />
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold text-xl tracking-wide">FANTASY</span>
              <span className="text-white font-bold text-xl tracking-wide">REALITY</span>
            </div>
          </div>

          {/* Desktop Navigation - Inline after logo */}
          <nav className="hidden lg:flex items-center gap-12 flex-1">
            {navLinks.map((link, index) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className={`text-base font-medium transition-colors ${
                  index === 0 ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Auth Buttons - always visible */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {user ? (
              <>
                <span className="hidden sm:inline text-white/60 text-sm truncate max-w-[120px]">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3 sm:px-5 py-2 rounded-lg bg-primary text-white font-medium text-xs sm:text-sm hover:bg-primary/90 transition-colors"
                >
                  My Shows
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-3 sm:px-5 py-2 rounded-lg text-white/80 hover:text-white border border-white/20 hover:border-white/40 font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth")}
                  className="px-3 sm:px-5 py-2 rounded-lg text-white/80 hover:text-white border border-white/20 hover:border-white/40 font-medium text-xs sm:text-sm transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="px-3 sm:px-5 py-2 rounded-lg bg-primary text-white font-medium text-xs sm:text-sm hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#070B18]/95 backdrop-blur-xl py-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-white/70 hover:text-white text-base font-medium transition-colors px-4 py-2 text-left"
                >
                  {link.label}
                </button>
              ))}
              <div className="border-t border-white/10 mt-2 pt-4 px-4 space-y-2">
                <button
                  onClick={() => navigate("/auth")}
                  className="w-full text-left text-white/70 hover:text-white text-base font-medium py-2"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/auth")}
                  className="w-full text-left text-white/70 hover:text-white text-base font-medium py-2"
                >
                  Sign Up
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
