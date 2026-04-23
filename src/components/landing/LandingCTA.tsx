import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import benefitsImage from "@/assets/landing/benefits-watching-tv.jpg";

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{
      background: "linear-gradient(180deg, #070B18 0%, #0B1630 50%, #070B18 100%)",
    }}>
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/15 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
            Personalize the experience for your users by introducing a{" "}
            <span className="text-gradient">fantasy reality game!</span>
          </h2>
          
          {/* Circular image with avatars */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg shadow-primary/20">
                <img
                  src={benefitsImage}
                  alt="Fantasy Reality"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Small avatars */}
            <div className="flex -space-x-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-[#070B18] flex items-center justify-center text-white text-xs font-bold">R</div>
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-[#070B18] flex items-center justify-center text-white text-xs font-bold">D</div>
              <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-[#070B18] flex items-center justify-center text-white text-xs font-bold">M</div>
              <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-[#070B18] flex items-center justify-center text-white text-xs font-bold">K</div>
            </div>
            
            <span className="text-white/60 text-sm">Fantasy Reality Show</span>
          </div>

          <Button
            onClick={() => navigate("/auth")}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/30"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
}
