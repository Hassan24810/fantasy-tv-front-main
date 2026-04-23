import featuresChartBg from "@/assets/landing/features-chart-bg.png";

export function LandingFeatures() {
  return (
    <section id="features" className="relative min-h-[600px] overflow-hidden" style={{
      background: "linear-gradient(180deg, #0B1630 0%, #0A1528 50%, #070B18 100%)",
    }}>
      {/* Background chart image on the right */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-2/3 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: `url(${featuresChartBg})` }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A1528] via-[#0A1528]/80 to-transparent" />
      
      {/* Top gradient transition */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#0B1630] to-transparent" />
      
      {/* Bottom gradient transition */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#070B18] to-transparent" />

      <div className="container mx-auto px-4 md:px-16 relative z-10 py-24 md:py-32">
        {/* Left text content */}
        <div className="max-w-xl">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Engage Fans with<br />
            Fantasy Leagues!
          </h2>
          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-lg">
            Your viewers will create teams of contestants, earn points based on 
            in-show events, and compete with friends in private leagues. 
            Imagine the excitement when fans see their favorite contestants 
            score +5 points for winning a challenge or lose -10 for getting 
            eliminated!
          </p>
        </div>
      </div>
    </section>
  );
}
