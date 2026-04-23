import { useState } from "react";
import { useShow } from "@/contexts/ShowContext";
import { B2CRegistrationDialog } from "./B2CRegistrationDialog";
import { useTranslation } from "react-i18next";

export const B2CHero = () => {
  const { show, branding, landingPageContent } = useShow();
  const { t } = useTranslation();
  const [showRegistration, setShowRegistration] = useState(false);
  const [initialStep, setInitialStep] = useState<"register" | "login">("register");

  const handleOpenDialog = (step: "register" | "login") => {
    setInitialStep(step);
    setShowRegistration(true);
  };

  const coverImage = branding?.cover_image_url;

  const showName = show?.name || "Fantasy";

  return (
    <section className="relative min-h-screen flex flex-col pt-0 overflow-hidden">
      {/* Accent line at the top using show primary color */}
      <div
        className="absolute top-20 left-0 right-0 h-1 z-20"
        style={{ background: `linear-gradient(to right, transparent, var(--show-primary), transparent)` }}
      />
      {/* Top Content Box (Dynamic Dark) */}
      <div className="relative z-20 flex-shrink-0 pt-40  px-4 overflow-hidden"
        style={{
          background: `linear-gradient(to bottom, 
              rgba(5, 2, 8, 1) 0%, 
              rgba(5, 2, 8, 0.8) 20%, 
              rgba(5, 2, 8, 0.7) 50%,
              rgba(5, 2, 8, 0.6) 80%, 
              #050208 100%)`
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {landingPageContent?.hero_title || t('b2cLanding.join')}
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
            Fantasy {showName}
          </h2>
          <p className="text-lg text-gray-300 max-w-xl mx-auto leading-relaxed">
            {landingPageContent?.hero_subtitle || t('b2cLanding.heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Bottom Image Section */}
      <div className="relative flex-1 md:min-h-screen w-full">
        {coverImage && (
          <div
            className="absolute inset-x-0 bottom-0 top-[15%] md:top-0 z-0 bg-no-repeat bg-cover bg-top md:bg-center"
            style={{
              backgroundImage: `url(${coverImage})`,
            }}
          />
        )}

        {/* Blending Overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to bottom, 
              rgba(5, 2, 8, 1) 0%, 
              rgba(5, 2, 8, 0.9) 20%, 
              rgba(5, 2, 8, 0.8) 50%,
              rgba(5, 2, 8, 0.7) 80%, 
              #050208 100%)`
          }}
        />
      </div>
      

      {/* Accent line at the bottom using show primary color */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 z-20"
        style={{ background: `linear-gradient(to right, transparent, var(--show-primary), transparent)` }}
      />
    </section>
  );
};
