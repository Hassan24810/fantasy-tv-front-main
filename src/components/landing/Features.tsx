import { Zap, Users, Trophy, BarChart3, Settings, Shield } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Zap,
    title: "Instant Game Creation",
    description: "Set up your fantasy game in minutes with our intuitive wizard. No coding required.",
  },
  {
    icon: Users,
    title: "Fan Engagement",
    description: "Build passionate communities around your shows with leagues and competitions.",
  },
  {
    icon: Trophy,
    title: "Custom Scoring",
    description: "Define unique scoring rules that match your show's events and drama.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track engagement, points, and fan activity with comprehensive dashboards.",
  },
  {
    icon: Settings,
    title: "Full Customization",
    description: "Tailor every aspect of the game to match your show's brand and style.",
  },
  {
    icon: Shield,
    title: "Enterprise Ready",
    description: "Secure, scalable infrastructure built for major TV networks and productions.",
  },
];

export function Features() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();
  const { ref: highlightRef, isVisible: highlightVisible } = useScrollAnimation();
  const { ref: benefitsRef, isVisible: benefitsVisible } = useScrollAnimation();

  return (
    <section id="features" className="py-16 md:py-24 relative overflow-hidden bg-background">
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-12 md:mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
            Create Your Fantasy Game{" "}
            <span className="text-gradient">Instantly</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Everything you need to launch engaging fantasy games for your reality TV shows
          </p>
        </div>

        {/* Features Grid */}
        <div 
          ref={gridRef}
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 transition-all duration-700 delay-200 ${
            gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-card border border-border rounded-2xl p-6 md:p-8 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Feature Highlight */}
        <div 
          ref={highlightRef}
          className={`mt-16 md:mt-24 grid lg:grid-cols-2 gap-8 md:gap-12 items-center transition-all duration-700 ${
            highlightVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="space-y-4 md:space-y-6">
            <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              Engage Fans with{" "}
              <span className="text-gradient">Fantasy Leagues</span>
            </h3>
            <p className="text-lg text-muted-foreground">
              Transform passive viewers into active participants. Let fans draft their favorite 
              contestants, earn points based on show events, and compete against friends and 
              other fans in custom leagues.
            </p>
            <ul className="space-y-3 md:space-y-4">
              {[
                "Create public or private leagues",
                "Custom scoring for show-specific events",
                "Real-time leaderboards and updates",
                "Social features and chat integration",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-foreground text-sm md:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold text-foreground text-sm md:text-base">League Standings</h4>
                  <span className="text-xs md:text-sm text-muted-foreground">Week 8</span>
                </div>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: "Fantasy Masters", points: 2450, change: "+120" },
                    { rank: 2, name: "Reality Kings", points: 2380, change: "+95" },
                    { rank: 3, name: "Drama Team", points: 2290, change: "+80" },
                    { rank: 4, name: "Show Stoppers", points: 2180, change: "+65" },
                  ].map((team) => (
                    <div key={team.rank} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-muted rounded-xl">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${
                        team.rank === 1 ? 'bg-gradient-primary text-primary-foreground' : 'bg-background text-muted-foreground'
                      }`}>
                        {team.rank}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground text-sm md:text-base">{team.name}</div>
                        <div className="text-xs text-muted-foreground">{team.points} pts</div>
                      </div>
                      <div className="text-green-600 text-xs md:text-sm font-medium">{team.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div 
          ref={benefitsRef}
          className={`mt-16 md:mt-24 transition-all duration-700 ${
            benefitsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center mb-8 md:mb-12">
            Why will this appeal to your TV show?
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: "📈", title: "Boost Ratings", desc: "Increase viewer retention and episode engagement" },
              { icon: "💬", title: "Social Buzz", desc: "Generate organic social media conversation" },
              { icon: "💰", title: "New Revenue", desc: "Monetize through premium leagues and features" },
              { icon: "🎯", title: "Fan Data", desc: "Gain insights into your most engaged viewers" },
            ].map((benefit, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-4 md:p-6 text-center hover:border-primary/50 transition-colors shadow-sm">
                <div className="text-3xl md:text-4xl mb-3 md:mb-4">{benefit.icon}</div>
                <h4 className="font-display font-semibold text-foreground mb-2 text-sm md:text-base">{benefit.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}