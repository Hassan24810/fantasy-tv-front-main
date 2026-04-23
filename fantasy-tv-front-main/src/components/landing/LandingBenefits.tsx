import { 
  Star, 
  Clock, 
  Users, 
  FileText, 
  Award 
} from "lucide-react";
import benefitsImage from "@/assets/landing/benefits-watching-tv.jpg";

const benefits = [
  {
    icon: Star,
    title: "Tailored Experiences",
    description: "By enabling viewers to create teams of their favorite participants and earn points based on performance, we offer a personalized experience that resonates with the \"this is for you\" communication approach.",
  },
  {
    icon: Clock,
    title: "Real-Time Engagement",
    description: "Our platform provides live updates and dynamic leaderboards that will make viewers stay connected and engaged throughout each episode. Give the viewers a possibility to get points in-real time.",
  },
  {
    icon: Users,
    title: "Building a vibrant community",
    description: "Social Media Integration: We leverage social media to create spaces where fans can share strategies, discuss episodes, and showcase their fantasy teams.",
  },
  {
    icon: FileText,
    title: "User-Generated Content",
    description: "By making fans create and share content related to the show, we foster a sense of community and deepen audience engagement.",
  },
  {
    icon: Award,
    title: "Gamification Elements",
    description: "Features like leaderboards and rewards create excitement and encourage friendly competition among viewers, enhancing engagement.",
  },
];

export function LandingBenefits() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{
      background: "linear-gradient(180deg, #070B18 0%, #0B1630 50%, #070B18 100%)",
    }}>
      <div className="container mx-auto px-4 md:px-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left column - title on top, then image aligned with benefits */}
          <div className="flex flex-col">
            {/* Title - only visible on mobile */}
            <h2 className="lg:hidden font-display text-3xl md:text-4xl font-bold text-white mb-10 leading-tight">
              Why will this<br />
              appeal to your<br />
              TV show?
            </h2>
            
            {/* Spacer for desktop to align image with benefits */}
            <div className="hidden lg:block" style={{ height: "140px" }} />
            
            {/* Image with blue glow border */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-[60px] rounded-3xl scale-95" />
              <div className="relative rounded-2xl overflow-hidden border-4 border-primary/40 shadow-2xl shadow-primary/30">
                <img
                  src={benefitsImage}
                  alt="Friends watching TV with popcorn"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070B18]/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Right content - title and benefits */}
          <div>
            {/* Title - only visible on desktop */}
            <h2 className="hidden lg:block font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-10 leading-tight">
              Why will this<br />
              appeal to your<br />
              TV show?
            </h2>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
