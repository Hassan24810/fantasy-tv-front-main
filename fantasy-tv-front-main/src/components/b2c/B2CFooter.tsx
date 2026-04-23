import { useShow } from "@/contexts/ShowContext";
import { Phone, Mail, Sparkles } from "lucide-react";
import logoIcon from "@/assets/fantasy-reality-icon.png";

// SVG icons for social media with fixed colors
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8.52h4.52V24H.22V8.52zM7.7 8.52h4.32v2.14h.06c.6-1.14 2.06-2.34 4.24-2.34 4.54 0 5.38 2.98 5.38 6.84V24h-4.5v-8.84c0-2.1-.04-4.8-2.92-4.8-2.92 0-3.37 2.28-3.37 4.62V24H7.7V8.52z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

export const B2CFooter = () => {
  const { show, branding } = useShow();

  // Build social media links
  const socialLinks = [
    {
      name: "X",
      username: branding?.twitter_username,
      url: branding?.twitter_username ? `https://x.com/${branding.twitter_username}` : "https://x.com",
      Icon: TwitterIcon,
      color: "#1DA1F2",
    },
    {
      name: "LinkedIn",
      username: undefined,
      url: "https://linkedin.com",
      Icon: LinkedInIcon,
      color: "#0077B5",
    },
    {
      name: "Facebook",
      username: branding?.facebook_username,
      url: branding?.facebook_username ? `https://facebook.com/${branding.facebook_username}` : "https://facebook.com",
      Icon: FacebookIcon,
      color: "#1877F2",
    },
    {
      name: "Instagram",
      username: branding?.instagram_username,
      url: branding?.instagram_username ? `https://instagram.com/${branding.instagram_username}` : "https://instagram.com",
      Icon: InstagramIcon,
      color: "#E4405F",
    },
  ];

  return (
    <footer 
      className="relative overflow-hidden bg-[#0a0510]"
      style={{ backgroundColor: 'var(--show-bg, #0a0510)', color: 'white' }}
    >
      {/* Accent top border using show primary */}
      <div
        className="h-[3px] w-full"
        style={{ background: 'linear-gradient(to right, transparent, var(--show-primary), var(--show-secondary), transparent)' }}
      />

      {/* Footer content */}
      <div className="relative z-[2] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Logo and contact */}
          <div className="flex flex-col items-center gap-6 mb-10">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={`${show?.name} Logo`}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-8 w-8" style={{ color: 'var(--show-primary)' }} />
                <span className="text-2xl font-bold text-white">
                  Fantasy {show?.name}
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 text-white/80 font-medium">
              {branding?.contact_phone ? (
                <a
                  href={`tel:${branding.contact_phone}`}
                  className="transition-colors hover:text-white"
                >
                  {branding.contact_phone}
                </a>
              ) : (
                <span className="opacity-50">+{show?.name ? "45 00000000" : "[phone number]"}</span>
              )}

              {branding?.contact_email ? (
                <a
                  href={`mailto:${branding.contact_email}`}
                  className="transition-colors hover:text-white"
                >
                  {branding.contact_email}
                </a>
              ) : (
                <span className="opacity-50">{show?.name ? "info@fantasy.com" : "[email]"}</span>
              )}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-6 mt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  className="transition-transform hover:scale-110 duration-200"
                  style={{ color: 'var(--show-primary)' }}
                >
                  <social.Icon className="w-8 h-8 opacity-80 hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 py-6 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} Fantasy Reality. All rights reserved.
            <span className="mx-2">|</span>
            <a href="#" className="hover:text-[var(--show-primary)] transition-colors">Privacy & terms & conditions</a>
          </div>
          <div className="text-sm text-white/40 flex items-center gap-2">
            Powered by
            <div className="flex items-center gap-1.5 ml-1">
              <img src={logoIcon} alt="Fantasy Reality" className="h-4 w-4 opacity-80" />
              <span className="font-bold text-white/90 tracking-tight text-xs">FANTASY REALITY</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
