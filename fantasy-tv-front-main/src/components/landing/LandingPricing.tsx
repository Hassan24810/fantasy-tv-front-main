import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Basic",
    subtitle: "Pay Per Season, No Additional Fees",
    price: "$299",
    period: "/season",
    features: [
      "Access to a production control fantasy product",
      "Self-service setup and admin",
      "Basic templates that you can easily",
      "Custom branding colors and logos",
      "Basic analytics & administrative",
      "Teams, participants", 
      "Up to 5,000+ active managed users",
      "Chat Support With A Bug Reporting",
      "Community Group in our Discord"
    ],
    highlighted: false,
  },
  {
    name: "Mid-Tier",
    subtitle: "Pay Per Season, No Additional Fees",
    price: "$699",
    period: "/season",
    features: [
      "Includes All Basic Plan",
      "Premium paid setup activities",
      "First on site integration available",
      "Support for updates requested",
      "Logger access released",
      "Later and later improvements",
      "Scalable & manageable use",
      "Integration connection",
      "Data/Entry Tracking Minor Tiers",
      "Starting to make engagement"
    ],
    highlighted: false,
  },
  {
    name: "Premium",
    subtitle: "SAAS* Season, No Additional Fees",
    price: "$1,499",
    period: "/season",
    features: [
      "Includes All Mid-Tier Plan",
      "Fully managed operations",
      "White-labeled/custom engine",
      "Custom scoring engines",
      "Full backend engagement",
      "Full on evaluation request",
      "Dedicated account managers",
      "Certified partnership program",
      "Development and custom services"
    ],
    highlighted: true,
  },
];

export function LandingPricing() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden" style={{
      background: "linear-gradient(180deg, #070B18 0%, #0A1528 50%, #070B18 100%)",
    }}>
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Choose Your <span className="text-gradient">Plan</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 ${
                plan.highlighted
                  ? "bg-primary/10 border-2 border-primary/50 shadow-lg shadow-primary/20"
                  : "bg-white/5 border border-white/10 hover:border-white/20"
              }`}
            >
              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-white/50 text-xs">{plan.subtitle}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-white/70 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => navigate("/auth")}
                className={`w-full rounded-full ${
                  plan.highlighted
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                }`}
              >
                {plan.highlighted ? "Buy Now" : "Start 14 Days Trial"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
