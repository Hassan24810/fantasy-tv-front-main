import heroImage from "@/assets/landing/hero-watching-tv.jpg";

export function LandingHero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Full-width background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Dark gradient overlay from left */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B18] via-[#070B18]/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070B18] via-transparent to-[#070B18]/30" />
      
      {/* Bottom fade transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#070B18]" />

      {/* Content */}
      <div className="container mx-auto px-4 md:px-16 relative z-10 pt-20">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl lg:text-[56px] font-bold text-white leading-[1.15] mb-6">
            Bring Your Reality Show to Life with{" "}
            <span className="text-primary">Fantasy Reality!</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 leading-relaxed">
            Turn your viewers into superfans with our powerful SaaS solution!
          </p>
        </div>
      </div>
    </section>
  );
}
