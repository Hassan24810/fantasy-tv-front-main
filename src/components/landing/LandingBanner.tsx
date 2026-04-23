import bannerBackground from "@/assets/landing/banner-background-new.png";

export function LandingBanner() {
  return (
    <section id="about" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bannerBackground})` }}
      />
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#070B18]/40" />
      
      {/* Top gradient transition from Hero */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#070B18] to-transparent" />
      
      {/* Bottom gradient transition to Features */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B1630] to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Create Your Fantasy Game{" "}
            <span className="text-gradient">Instantly!</span>
          </h2>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            In just a few minutes, you can set up a custom fantasy game for your reality show. 
            Simply add your show name, logo, participants, scoring rules, and team restrictions, 
            and the platform takes care of the rest.
          </p>
        </div>
      </div>
    </section>
  );
}
