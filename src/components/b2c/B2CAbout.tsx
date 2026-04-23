import { useShow } from "@/contexts/ShowContext";
import { Target, Users, Tv, Crown, Star, Users2, Trophy, Award, Zap, Heart, Flame } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "react-i18next";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Target, Users, Tv, Crown, Star, Users2, Trophy, Award, Zap, Heart, Flame,
};

export const B2CAbout = () => {
  const { show, branding, landingPageContent } = useShow();
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useTranslation();
  const showName = show?.name || "the show";

  const defaultItems = [
    { icon: "Target", text: t('b2cLanding.aboutItem1', { show: showName }) },
    { icon: "Users", text: t('b2cLanding.aboutItem2') },
    { icon: "Tv", text: t('b2cLanding.aboutItem3') },
  ];

  const coverImage = branding?.cover_image_url;
  const title = landingPageContent?.about_title || t('b2cLanding.aboutTitle');
  const description = landingPageContent?.about_description ||
    t('b2cLanding.aboutDescription', { show: showName });
  const items = landingPageContent?.about_items?.length ? landingPageContent.about_items : defaultItems;

  return (
    <section className="relative py-32 px-4 overflow-hidden">
      {/* Cover image background */}
      {coverImage && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${coverImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {/* Gradient overlay for text readability */}
      {coverImage && (
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `linear-gradient(to  right,
              rgba(10, 5, 16, 1) 0%,
              rgba(10, 5, 16, 0.9) 30%,
              rgba(10, 5, 16, 0.8) 60%,
              rgba(10, 5, 16, 0.8) 70%,
              rgba(10, 5, 16, 0.8) 100%)`,
          }}
        />
      )}

      <div
        ref={ref}
        className={`relative z-[2] max-w-4xl mx-auto md:mx-24 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <div className="text-left flex flex-col w-full md:w-1/2 z-[10] px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 whitespace-pre-line">
            {title}
          </h2>

          <p className="text-sm text-gray-300 mb-10 max-w-2xl">
            {description}
          </p>

          <div className="space-y-5">
            {items.map((item, index) => {
              const IconComponent = ICON_MAP[item.icon] || Target;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 transition-all duration-500"
                  style={{ transitionDelay: `${index * 100 + 200}ms` }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(var(--show-primary-rgb), 0.2)' }}
                  >
                    <IconComponent
                      className="w-5 h-5"
                      style={{ color: 'var(--show-primary)' }}
                    />
                  </div>
                  <span className="text-gray-200 text-sm">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
