import { useShow } from "@/contexts/ShowContext";
import { Crown, Star, Users2, Trophy, Target, Users, Tv, Award, Zap, Heart, Flame } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "react-i18next";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Crown, Star, Users2, Trophy, Target, Users, Tv, Award, Zap, Heart, Flame,
};

export const B2CHowItWorks = () => {
  const { landingPageContent } = useShow();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();
  const { t } = useTranslation();

  const defaultSteps = [
    { icon: "Crown", title: t('b2cLanding.step1Title'), description: t('b2cLanding.step1Desc') },
    { icon: "Star", title: t('b2cLanding.step2Title'), description: t('b2cLanding.step2Desc') },
    { icon: "Users2", title: t('b2cLanding.step3Title'), description: t('b2cLanding.step3Desc') },
    { icon: "Trophy", title: t('b2cLanding.step4Title'), description: t('b2cLanding.step4Desc') },
  ];

  const title = landingPageContent?.how_it_works_title || t('b2cLanding.howItWorksTitle');
  const subtitle = landingPageContent?.how_it_works_subtitle || t('b2cLanding.howItWorksSubtitle');
  const steps = landingPageContent?.how_it_works_cards?.length ? landingPageContent.how_it_works_cards : defaultSteps;

  return (
    <section 
      className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto ">
        <div 
          ref={headerRef}
          className={`text-center mb-12 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div 
          ref={gridRef}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 delay-200 ${
            gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {steps.map((step, index) => {
            const IconComponent = ICON_MAP[step.icon] || Crown;
            return (
              <div
                key={index}
                className="group relative pl-6 pr-12 pt-4 pb-8 rounded-2xl border backdrop-blur-xl shadow-lg transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(var(--show-primary-rgb), 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div className="mb-5">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(var(--show-primary-rgb), 0.2), rgba(var(--show-secondary-rgb), 0.2))'
                    }}
                  >
                    <IconComponent 
                      className="w-7 h-7"
                      style={{ color: 'var(--show-primary)' }}
                    />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
