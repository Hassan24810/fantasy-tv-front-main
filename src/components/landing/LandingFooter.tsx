import { Sparkles } from "lucide-react";
import logoIcon from "@/assets/fantasy-reality-icon.png";

const footerLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Pricing", href: "#pricing" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

export function LandingFooter() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="relative py-12 overflow-hidden" style={{
      background: "#070B18",
    }}>
      <div className="container mx-auto px-4 md:px-6">
        {/* Logo centered */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <img src={logoIcon} alt="Fantasy Reality" className="h-6 w-6" />
          </div>
          <div className="text-center">
            <span className="text-primary font-bold text-sm tracking-wide">FANTASY</span>
            <span className="text-white font-bold text-sm tracking-wide ml-1">REALITY SHOW</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-wrap justify-center gap-6 mb-8">
          {footerLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Social icons */}
        <div className="flex justify-center gap-4 mb-8">
          {["twitter", "linkedin", "facebook", "instagram"].map((social) => (
            <a
              key={social}
              href="#"
              className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                {social === "twitter" && (
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                )}
                {social === "linkedin" && (
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M2 4a2 2 0 114 0 2 2 0 01-4 0z" />
                )}
                {social === "facebook" && (
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                )}
                {social === "instagram" && (
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                )}
              </svg>
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-white/40 text-sm mb-2">
            © {new Date().getFullYear()} Fantasy Reality Show. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 text-white/40 text-xs">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <span>and</span>
            <a href="#" className="hover:text-white/60 transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
