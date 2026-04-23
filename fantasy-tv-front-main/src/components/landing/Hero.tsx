import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Hero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleStartGame = () => {
    if (user) {
      navigate("/onboarding");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-secondary">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-6 md:space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-white/70">{t('landing.heroTitle')} {t('landing.heroTitleHighlight')}</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t('landing.heroSubtitle').split('.')[0]}.{" "}
              <span className="text-gradient">Fantasy Reality!</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0">
              {t('landing.heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:opacity-90 transition-opacity text-base md:text-lg px-6 md:px-8 py-5 md:py-6 glow-primary"
                onClick={handleStartGame}
              >
                {t('landing.startYourGame')}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 border-border hover:bg-secondary"
                onClick={() => scrollToSection("#features")}
              >
                <Play className="w-5 h-5 mr-2" />
                {t('landing.seeHowItWorks')}
              </Button>
            </div>
            
            {!user && (
              <div className="flex justify-center lg:justify-start">
                <Button 
                  variant="link" 
                  className="text-white/70 hover:text-white"
                  onClick={() => navigate("/auth")}
                >
                  {t('auth.hasAccount')} {t('landing.logIn')}
                </Button>
              </div>
            )}

          </div>

          {/* Right Content - Hero Image */}
          <div className="relative animate-slide-in-right hidden lg:block">
            <div className="relative z-10">
              <div className="w-full aspect-square max-w-lg mx-auto relative">
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-xl animate-float" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/20 rounded-full blur-xl animate-float" style={{ animationDelay: "1s" }} />
                
                {/* Main card */}
                <div className="glass rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                  <div className="relative space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                        <span className="text-2xl">🎬</span>
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-white">{t('landing.fantasyLeagueExample')}</h3>
                        <p className="text-sm text-white/60">Season 12 Active</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">👤</div>
                          <span className="font-medium text-white">Team Alpha</span>
                        </div>
                        <span className="text-primary font-bold">1,250 pts</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">👤</div>
                          <span className="font-medium text-white">Team Beta</span>
                        </div>
                        <span className="text-primary font-bold">1,180 pts</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">👤</div>
                          <span className="font-medium text-white">Team Gamma</span>
                        </div>
                        <span className="text-primary font-bold">1,090 pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
