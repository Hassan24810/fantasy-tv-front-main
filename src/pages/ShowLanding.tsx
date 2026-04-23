import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ShowProvider, useShow } from "@/contexts/ShowContext";
import { B2CLandingNavigation } from "@/components/b2c/B2CLandingNavigation";
import { B2CHero } from "@/components/b2c/B2CHero";
import { B2CAbout } from "@/components/b2c/B2CAbout";
import { B2CHowItWorks } from "@/components/b2c/B2CHowItWorks";
import { B2CParticipants } from "@/components/b2c/B2CParticipants";
import { B2CRules } from "@/components/b2c/B2CRules";
import { B2CFAQ } from "@/components/b2c/B2CFAQ";
import { B2CFooter } from "@/components/b2c/B2CFooter";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ImageOff } from "lucide-react";

const ShowLandingContent = () => {
  const { show, branding, isLoading, error } = useShow();
  const navigate = useNavigate();

  // Redirect logged-in users who are registered for this show to the app
  useEffect(() => {
    if (!show?.id) return;

    const checkAuthAndRedirect = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if user has show_user record for this show
        const { data: showUser } = await supabase
          .from("show_users")
          .select("id")
          .eq("show_id", show.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (showUser) {
          // User is registered for this show, redirect to app
          navigate(`/app/${show.id}`, { replace: true });
        }
      }
    };

    checkAuthAndRedirect();
  }, [show?.id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Show Not Found</h1>
          <p className="text-gray-400">The fantasy game you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Extract branding with fallbacks
  const primaryColor = branding?.primary_color || "#ec4899";
  const secondaryColor = branding?.secondary_color || "#8b5cf6";
  const hasBranding = branding?.logo_url || branding?.cover_image_url;

  // Build background style using show brand colors
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: "#0a0510",
    backgroundImage: `radial-gradient(circle at 20% 0%, ${primaryColor}20, transparent 40%), 
                      radial-gradient(circle at 80% 50%, ${secondaryColor}15, transparent 40%),
                      radial-gradient(circle at 50% 100%, ${primaryColor}10, transparent 50%)`,
    backgroundAttachment: "fixed",
  };

  // Helper to convert hex to HSL components for Tailwind
  const hexToHsl = (hex: string): string => {
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
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div
      className="min-h-screen"
      style={{
        ...backgroundStyle,
        "--primary": hexToHsl(primaryColor),
        "--secondary": hexToHsl(secondaryColor),
        "--show-primary": primaryColor,
        "--show-secondary": secondaryColor,
        "--show-primary-rgb": hexToRgb(primaryColor),
        "--show-secondary-rgb": hexToRgb(secondaryColor),
        "--show-bg": "#0a0510",
        "--show-bg-dark": "#050208",
      } as React.CSSProperties}
    >
      {/* Navigation */}
      <B2CLandingNavigation />

      {/* Show admin notice if no branding */}
      {!hasBranding && (
        <div className="fixed top-20 right-4 z-40 bg-amber-500/90 text-amber-950 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg">
          <ImageOff className="h-4 w-4" />
          Branding not configured
        </div>
      )}
      
      <B2CHero />
      <section id="about"><B2CAbout /></section>
      <section id="how-it-works"><B2CHowItWorks /></section>
      <section id="participants"><B2CParticipants /></section>
      <section id="rules"><B2CRules /></section>
      <section id="faq"><B2CFAQ /></section>
      <B2CFooter />
    </div>
  );
};

// Helper to convert hex to RGB for use in rgba()
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "236, 72, 153"; // Fallback to pink
}

const ShowLanding = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Invalid Show</h1>
          <p className="text-gray-400">No show specified.</p>
        </div>
      </div>
    );
  }

  return (
    <ShowProvider showSlug={slug}>
      <ShowLandingContent />
    </ShowProvider>
  );
};

export default ShowLanding;
