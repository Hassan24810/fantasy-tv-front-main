import React from "react";
import { useShow } from "@/contexts/ShowContext";
import { Loader2, ImageOff, Sparkles, User } from "lucide-react";


interface B2CLayoutProps {
  children: React.ReactNode;
}

export const B2CLayout: React.FC<B2CLayoutProps> = ({ children }) => {
  const { show, branding, isLoading, error } = useShow();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Show Not Found</h1>
          <p className="text-muted-foreground">The fantasy game you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Extract branding with fallbacks
  const primaryColor = branding?.primary_color || "#3b82f6";
  const secondaryColor = branding?.secondary_color || "#8b5cf6";
  const coverImage = branding?.cover_image_url;
  const hasBranding = branding?.logo_url || branding?.background_image_url || branding?.cover_image_url;

  // Helper to convert hex to HSL components for Tailwind
  const hexToHslValues = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const hsl = hexToHslValues(primaryColor);
  const showBg = `hsl(${hsl.h} ${Math.min(hsl.s, 40)}% 5%)`;
  const showBgDark = `hsl(${hsl.h} ${Math.min(hsl.s, 40)}% 2%)`;

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return "59, 130, 246"; // Fallback to blue
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        "--primary": `${hsl.h} ${hsl.s}% ${hsl.l}%`,
        "--secondary": branding?.secondary_color ? (() => {
          const sHsl = hexToHslValues(branding.secondary_color);
          return `${sHsl.h} ${sHsl.s}% ${sHsl.l}%`;
        })() : "262 83% 58%",
        "--show-primary": primaryColor,
        "--show-secondary": secondaryColor,
        "--show-primary-rgb": hexToRgb(primaryColor),
        "--show-secondary-rgb": hexToRgb(secondaryColor),
        "--show-bg": showBg,
        "--show-bg-dark": showBgDark,
      } as React.CSSProperties}
    >
      {/* Cover Image Banner at Top */}
      {coverImage && (
        <div className="relative h-48 md:h-64 w-full overflow-hidden">
          <img
            src={coverImage}
            alt={`${show.name} Cover`}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(0,0,0,0.7) 0% , rgba(0,0,0,0.7) 100%)`,
            }}
          />

          {/* Logo */}
          <div className="absolute top-5 left-12 z-10 items-center">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={`${show?.name} Logo`}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" style={{ color: 'var(--show-primary)' }} />
                <span className="text-lg font-bold text-white">
                  {show?.name || "Fantasy"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show admin notice if no branding */}
      {!hasBranding && (
        <div className="fixed top-4 right-4 z-50 bg-amber-500/90 text-amber-950 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg">
          <ImageOff className="h-4 w-4" />
          Branding not configured
        </div>
      )}

      {/* Content on white background */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};
