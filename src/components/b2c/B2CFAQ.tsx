import { useShow } from "@/contexts/ShowContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "react-i18next";

export const B2CFAQ = () => {
  const { show, settings, landingPageContent } = useShow();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: accordionRef, isVisible: accordionVisible } = useScrollAnimation();
  const { t } = useTranslation();

  const showName = show?.name || "the show";

  const defaultFaqs = [
    {
      question: t('b2cLanding.faqQ1', { show: showName }),
      answer: t('b2cLanding.faqA1', { show: showName }),
    },
    {
      question: t('b2cLanding.faqQ2'),
      answer: t('b2cLanding.faqA2'),
    },
    {
      question: t('b2cLanding.faqQ3'),
      answer: t('b2cLanding.faqA3', { 
        teamSize: settings?.team_size || 5, 
        transfers: settings?.transfers_per_reset || 2, 
        frequency: settings?.transfer_reset_frequency || "week" 
      }),
    },
    {
      question: t('b2cLanding.faqQ4'),
      answer: t('b2cLanding.faqA4'),
    },
    {
      question: t('b2cLanding.faqQ5'),
      answer: t('b2cLanding.faqA5'),
    },
  ];

  const title = landingPageContent?.faq_title || t('b2cLanding.faqTitle');
  const faqs = landingPageContent?.faq_items?.length ? landingPageContent.faq_items : defaultFaqs;

  return (
    <section className="relative py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div 
          ref={headerRef}
          className={`text-center mb-12 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
        </div>

        <Accordion 
          ref={accordionRef}
          type="single" 
          collapsible 
          className={`space-y-4 transition-all duration-700 delay-200 ${
            accordionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl px-6 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <AccordionTrigger 
                className="text-white text-left hover:no-underline py-5"
                style={{
                  ['--accordion-trigger-color' as string]: 'var(--show-primary)',
                }}
              >
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
