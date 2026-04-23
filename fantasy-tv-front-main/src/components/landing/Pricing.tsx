import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const plans = [
  {
    name: "Basic",
    price: "$499",
    period: "/month",
    description: "Perfect for smaller shows and pilots",
    features: [
      "1 Active Show",
      "Up to 1,000 fans",
      "Basic scoring rules",
      "Email support",
      "Standard analytics",
    ],
    highlighted: false,
  },
  {
    name: "Mid-Tier",
    price: "$999",
    period: "/month",
    description: "For established shows with growing audiences",
    features: [
      "3 Active Shows",
      "Up to 10,000 fans",
      "Custom scoring rules",
      "Priority support",
      "Advanced analytics",
      "Social integrations",
      "Custom branding",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$2,499",
    period: "/month",
    description: "Enterprise solution for major networks",
    features: [
      "Unlimited Shows",
      "Unlimited fans",
      "Full customization",
      "Dedicated account manager",
      "Real-time analytics",
      "API access",
      "White-label solution",
      "Custom integrations",
    ],
    highlighted: false,
  },
];

export function Pricing() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation();

  return (
    <section id="pricing" className="py-16 md:py-24 relative overflow-hidden bg-muted/50">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-12 md:mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
            Simple, Transparent{" "}
            <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Choose the plan that fits your show's needs. Scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div 
          ref={cardsRef}
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto transition-all duration-700 delay-200 ${
            cardsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-2 ${
                plan.highlighted
                  ? "bg-gradient-primary border-2 border-primary glow-primary"
                  : "bg-card border border-border shadow-sm"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-foreground text-background text-xs md:text-sm font-medium rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="text-center mb-6 md:mb-8">
                <h3 className={`font-display text-xl md:text-2xl font-bold mb-2 ${
                  plan.highlighted ? "text-white" : "text-foreground"
                }`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-4xl md:text-5xl font-bold ${
                    plan.highlighted ? "text-white" : "text-foreground"
                  }`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm md:text-base ${
                    plan.highlighted ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${
                  plan.highlighted ? "text-white/80" : "text-muted-foreground"
                }`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      plan.highlighted ? "bg-white/20" : "bg-primary/20"
                    }`}>
                      <Check className={`w-3 h-3 ${
                        plan.highlighted ? "text-white" : "text-primary"
                      }`} />
                    </div>
                    <span className={`text-sm md:text-base ${
                      plan.highlighted ? "text-white" : "text-foreground"
                    }`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full text-sm md:text-base py-5 md:py-6 ${
                  plan.highlighted
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-gradient-primary hover:opacity-90"
                }`}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 md:mt-16">
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            Need a custom solution for your network?
          </p>
          <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-muted text-sm md:text-base">
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
}