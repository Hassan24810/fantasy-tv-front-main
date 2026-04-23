import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqs = [
  {
    question: "How quickly can I launch a fantasy game for my show?",
    answer: "You can have your fantasy game up and running within 24-48 hours. Our intuitive setup wizard guides you through the entire process, from adding contestants to configuring scoring rules.",
  },
  {
    question: "Can I customize the scoring rules for my show's unique events?",
    answer: "Absolutely! Our platform allows you to create unlimited custom scoring events tailored to your show's specific moments. Whether it's drama, challenges, eliminations, or romance, you can assign points to anything.",
  },
  {
    question: "How do fans join and play the fantasy game?",
    answer: "Fans can join through a simple signup process. They can create or join leagues, draft contestants, and track their scores in real-time. The platform works seamlessly on web and mobile devices.",
  },
  {
    question: "Is the platform white-labeled for my show's branding?",
    answer: "Yes! Premium plans include full white-labeling capabilities. You can customize colors, logos, and branding to match your show's identity, creating a seamless fan experience.",
  },
  {
    question: "What kind of analytics and insights do you provide?",
    answer: "Our analytics dashboard provides comprehensive insights including fan engagement metrics, popular contestants, league activity, social sharing stats, and viewer behavior patterns to help you understand your audience better.",
  },
  {
    question: "Do you offer integration with social media platforms?",
    answer: "Yes! We offer integrations with major social platforms including Twitter, Instagram, and Facebook. Fans can share their teams, scores, and achievements, driving organic engagement for your show.",
  },
  {
    question: "What happens if I need to change scoring mid-season?",
    answer: "Our platform is flexible enough to handle mid-season adjustments. You can add new events, modify point values, and even introduce special bonus rounds without disrupting the existing game.",
  },
  {
    question: "Is there customer support available during live shows?",
    answer: "Premium and Enterprise plans include dedicated support during live broadcasts. Our team is available to help with real-time scoring updates, technical issues, and fan inquiries.",
  },
];

export function FAQ() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: accordionRef, isVisible: accordionVisible } = useScrollAnimation();

  return (
    <section id="faq" className="py-16 md:py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-12 md:mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6">
            Frequently Asked{" "}
            <span className="text-gradient">Questions</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Everything you need to know about Fantasy Reality
          </p>
        </div>

        {/* FAQ Accordion */}
        <div 
          ref={accordionRef}
          className={`max-w-3xl mx-auto transition-all duration-700 delay-200 ${
            accordionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-4 md:px-6 shadow-sm"
              >
                <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 md:pb-6 text-sm md:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}