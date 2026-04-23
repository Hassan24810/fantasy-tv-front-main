import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Fantasy Reality?",
    answer: "It's Fantasy Premier League, but for reality TV. Viewers pick contestants, earn points from what happens in the episodes, and compete with friends in leagues for the ultimate bragging rights.",
  },
  {
    question: "How fast can we launch, and what do you need from us?",
    answer: "Quick. You fill in a short setup form with your show and season details, add a background image, upload the participants, choose your scoring rules and team restrictions, and you're ready to go.",
  },
  {
    question: "How does scoring work, and who updates it?",
    answer: "After each episode, you log the key moments in the B2B dashboard, or we can handle it for you. The game updates points and standings automatically, so you don't have to chase spreadsheets or double-check episode details.",
  },
  {
    question: "Do we get any data?",
    answer: "Yes. You'll get a dashboard with clear insights, like which contestants viewers pick most, who's transferred in and out the most, and which participants are driving the most events. You can also drill into leagues to see how different groups are playing.",
  },
  {
    question: "What can we customize?",
    answer: "A lot. You control the scoring rules, team size, transfer limits, episode locks, and participant statuses, including custom labels if you want to highlight special roles or twists.",
  },
  {
    question: "How do we make money, and how do we know it works?",
    answer: "You can monetize through sponsorships, branded leagues, premium features, and commerce tie-ins. And you'll see whether it's working through metrics like retention between episodes, league activity, live uplift, and overall engagement.",
  },
];

export function LandingFAQ() {
  return (
    <section id="reviews" className="relative py-24 md:py-32 overflow-hidden" style={{
      background: "linear-gradient(180deg, #0B1630 0%, #070B18 100%)",
    }}>
      {/* Glow effect */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-xl px-6 backdrop-blur-sm"
              >
                <AccordionTrigger className="text-left text-white font-medium hover:no-underline py-5 text-sm md:text-base [&[data-state=open]>svg]:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/60 pb-5 text-sm">
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
