import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Target, Users, Tv, Crown, Star, Users2, Trophy, Award, Zap, Heart, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_ICONS = [
  { name: "Target", icon: Target },
  { name: "Users", icon: Users },
  { name: "Tv", icon: Tv },
  { name: "Crown", icon: Crown },
  { name: "Star", icon: Star },
  { name: "Users2", icon: Users2 },
  { name: "Trophy", icon: Trophy },
  { name: "Award", icon: Award },
  { name: "Zap", icon: Zap },
  { name: "Heart", icon: Heart },
  { name: "Flame", icon: Flame },
];

interface AboutItem {
  icon: string;
  text: string;
}

interface HowItWorksCard {
  icon: string;
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface LandingPageContent {
  id?: string;
  show_id: string;
  hero_title: string;
  hero_subtitle: string;
  about_title: string;
  about_description: string | null;
  about_items: AboutItem[];
  how_it_works_title: string;
  how_it_works_subtitle: string | null;
  how_it_works_cards: HowItWorksCard[];
  faq_title: string;
  faq_items: FAQItem[];
}

interface LandingPageSectionProps {
  showId: string;
  showName?: string;
}

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const IconComponent = AVAILABLE_ICONS.find(i => i.name === value)?.icon || Target;
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[100px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_ICONS.map((item) => (
          <SelectItem key={item.name} value={item.name}>
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const getDefaultContent = (showId: string): LandingPageContent => ({
  show_id: showId,
  hero_title: "",
  hero_subtitle: "",
  about_title: "What's This All About?",
  about_description: null,
  about_items: [
    { icon: "Target", text: "Predict what happens in the show based on predefined rules" },
    { icon: "Users", text: "Compete with your friends" },
    { icon: "Tv", text: "Get even more involved with your favorite TV show" },
  ],
  how_it_works_title: "How It Works",
  how_it_works_subtitle: "Follow these simple steps to start competing and winning.",
  how_it_works_cards: [
    { icon: "Crown", title: "Make Predictions", description: "Choose who you think will win, get eliminated, or cause drama." },
    { icon: "Star", title: "Earn and Win Points", description: "Get rewarded for accurate picks each week." },
    { icon: "Users2", title: "Join the League", description: "Create your account and get your fantasy picks ready." },
    { icon: "Trophy", title: "Climb the Leaderboard", description: "Compete with others and aim for the top spot." },
  ],
  faq_title: "Frequently Asked Questions",
  faq_items: [],
});

export function LandingPageSection({ showId, showName = "the show" }: LandingPageSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<LandingPageContent>(getDefaultContent(showId));

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("landing_page_content")
          .select("*")
          .eq("show_id", showId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching landing page content:", error);
        }

        if (data) {
          setContent({
            ...data,
            hero_title: data.hero_title || "",
            hero_subtitle: data.hero_subtitle || "",
            about_items: (data.about_items as unknown as AboutItem[]) || [],
            how_it_works_cards: (data.how_it_works_cards as unknown as HowItWorksCard[]) || [],
            faq_items: (data.faq_items as unknown as FAQItem[]) || [],
          });
        } else {
          setContent(getDefaultContent(showId));
        }
      } catch (err) {
        console.error("Error loading landing page content:", err);
      } finally {
        setLoading(false);
      }
    };

    if (showId) {
      fetchContent();
    }
  }, [showId]);

  const saveContent = async () => {
    setSaving(true);
    try {
      const payload = {
        show_id: showId,
        hero_title: content.hero_title || null,
        hero_subtitle: content.hero_subtitle || null,
        about_title: content.about_title,
        about_description: content.about_description,
        about_items: JSON.parse(JSON.stringify(content.about_items)),
        how_it_works_title: content.how_it_works_title,
        how_it_works_subtitle: content.how_it_works_subtitle,
        how_it_works_cards: JSON.parse(JSON.stringify(content.how_it_works_cards)),
        faq_title: content.faq_title,
        faq_items: JSON.parse(JSON.stringify(content.faq_items)),
      };

      if (content.id) {
        const { error } = await supabase
          .from("landing_page_content")
          .update(payload)
          .eq("id", content.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("landing_page_content")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setContent({ ...content, id: data.id });
      }

      toast({
        title: t('settings.landingPageSection.saved'),
        description: t('settings.landingPageSection.savedDescription'),
      });
    } catch (err) {
      console.error("Error saving landing page content:", err);
      toast({
        title: t('toast.error'),
        description: t('toast.pleaseTryAgain'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // About section handlers
  const updateAboutItem = (index: number, field: keyof AboutItem, value: string) => {
    const newItems = [...content.about_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setContent({ ...content, about_items: newItems });
  };

  const addAboutItem = () => {
    if (content.about_items.length < 5) {
      setContent({
        ...content,
        about_items: [...content.about_items, { icon: "Star", text: "" }],
      });
    }
  };

  const removeAboutItem = (index: number) => {
    setContent({
      ...content,
      about_items: content.about_items.filter((_, i) => i !== index),
    });
  };

  // How It Works handlers
  const updateHowItWorksCard = (index: number, field: keyof HowItWorksCard, value: string) => {
    const newCards = [...content.how_it_works_cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setContent({ ...content, how_it_works_cards: newCards });
  };

  // FAQ handlers
  const updateFAQItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...content.faq_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setContent({ ...content, faq_items: newItems });
  };

  const addFAQItem = () => {
    if (content.faq_items.length < 10) {
      setContent({
        ...content,
        faq_items: [...content.faq_items, { question: "", answer: "" }],
      });
    }
  };

  const removeFAQItem = (index: number) => {
    setContent({
      ...content,
      faq_items: content.faq_items.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <Card className="bg-card border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">{t('settings.landingPageSection.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('settings.landingPageSection.heroSection', 'Hero Section')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">{t('settings.landingPageSection.heroTitle', 'Hero Title')}</Label>
            <Input
              id="heroTitle"
              value={content.hero_title}
              onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
              placeholder={t('settings.landingPageSection.heroTitlePlaceholder', 'e.g. Join the Game')}
            />
            <p className="text-xs text-muted-foreground">{t('settings.landingPageSection.heroTitleHint', 'Leave empty to use the default text')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">{t('settings.landingPageSection.heroSubtitle', 'Hero Subtitle')}</Label>
            <Textarea
              id="heroSubtitle"
              value={content.hero_subtitle}
              onChange={(e) => setContent({ ...content, hero_subtitle: e.target.value })}
              placeholder={t('settings.landingPageSection.heroSubtitlePlaceholder', 'e.g. Pick your team, earn points, and compete with friends!')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* What's This All About Section */}
      <Card className="bg-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('settings.landingPageSection.aboutSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aboutTitle">{t('settings.landingPageSection.sectionTitle')}</Label>
            <Input
              id="aboutTitle"
              value={content.about_title}
              onChange={(e) => setContent({ ...content, about_title: e.target.value })}
              placeholder={t('settings.landingPageSection.aboutTitlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aboutDescription">{t('settings.landingPageSection.descriptionLabel')}</Label>
            <Textarea
              id="aboutDescription"
              value={content.about_description || ""}
              onChange={(e) => setContent({ ...content, about_description: e.target.value })}
              placeholder={t('settings.landingPageSection.aboutDescriptionPlaceholder', { showName })}
              rows={3}
            />
          </div>
          <div className="space-y-3">
            <Label>{t('settings.landingPageSection.bulletPoints')}</Label>
            {content.about_items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <IconSelect
                  value={item.icon}
                  onChange={(v) => updateAboutItem(index, "icon", v)}
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateAboutItem(index, "text", e.target.value)}
                  placeholder={t('settings.landingPageSection.describeFeature')}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAboutItem(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {content.about_items.length < 5 && (
              <Button variant="outline" size="sm" onClick={addAboutItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.landingPageSection.addBulletPoint')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works Section */}
      <Card className="bg-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('settings.landingPageSection.howItWorksSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="howItWorksTitle">{t('settings.landingPageSection.sectionTitle')}</Label>
              <Input
                id="howItWorksTitle"
                value={content.how_it_works_title}
                onChange={(e) => setContent({ ...content, how_it_works_title: e.target.value })}
                placeholder={t('settings.landingPageSection.howItWorksTitlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="howItWorksSubtitle">{t('settings.landingPageSection.subtitle')}</Label>
              <Input
                id="howItWorksSubtitle"
                value={content.how_it_works_subtitle || ""}
                onChange={(e) => setContent({ ...content, how_it_works_subtitle: e.target.value })}
                placeholder={t('settings.landingPageSection.howItWorksSubtitlePlaceholder')}
              />
            </div>
          </div>
          <div className="space-y-4">
            <Label>{t('settings.landingPageSection.cards')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.how_it_works_cards.map((card, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t('settings.landingPageSection.step', { number: index + 1 })}</span>
                      <IconSelect
                        value={card.icon}
                        onChange={(v) => updateHowItWorksCard(index, "icon", v)}
                      />
                    </div>
                    <Input
                      value={card.title}
                      onChange={(e) => updateHowItWorksCard(index, "title", e.target.value)}
                      placeholder={t('settings.landingPageSection.stepTitlePlaceholder')}
                    />
                    <Textarea
                      value={card.description}
                      onChange={(e) => updateHowItWorksCard(index, "description", e.target.value)}
                      placeholder={t('settings.landingPageSection.stepDescriptionPlaceholder')}
                      rows={2}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="bg-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle>{t('settings.landingPageSection.faqSection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faqTitle">{t('settings.landingPageSection.sectionTitle')}</Label>
            <Input
              id="faqTitle"
              value={content.faq_title}
              onChange={(e) => setContent({ ...content, faq_title: e.target.value })}
              placeholder={t('settings.landingPageSection.faqTitlePlaceholder')}
            />
          </div>
          <div className="space-y-4">
            <Label>{t('settings.landingPageSection.questionsAndAnswers')}</Label>
            {content.faq_items.map((item, index) => (
              <Card key={index} className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('settings.landingPageSection.question', { number: index + 1 })}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFAQItem(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    value={item.question}
                    onChange={(e) => updateFAQItem(index, "question", e.target.value)}
                    placeholder={t('settings.landingPageSection.enterQuestion')}
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateFAQItem(index, "answer", e.target.value)}
                    placeholder={t('settings.landingPageSection.enterAnswer')}
                    rows={3}
                  />
                </CardContent>
              </Card>
            ))}
            {content.faq_items.length < 10 && (
              <Button variant="outline" size="sm" onClick={addFAQItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.landingPageSection.addFaq')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveContent} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('settings.landingPageSection.saveLandingPage')}
        </Button>
      </div>
    </div>
  );
}