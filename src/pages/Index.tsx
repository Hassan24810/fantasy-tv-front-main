import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingBanner } from "@/components/landing/LandingBanner";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingContact } from "@/components/landing/LandingContact";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: "#070B18" }}>
      <LandingNav />
      <LandingHero />
      <LandingBanner />
      <LandingFeatures />
      <LandingBenefits />
      <LandingPricing />
      <LandingFAQ />
      <LandingContact />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
};

export default Index;
