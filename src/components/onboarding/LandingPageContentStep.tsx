import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Target, Users, Tv, Crown, Star, Users2, Trophy, Award, Zap, Heart, Flame } from "lucide-react";
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

export interface AboutItem {
  icon: string;
  text: string;
}

export interface HowItWorksCard {
  icon: string;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface LandingPageContent {
  aboutTitle: string;
  aboutDescription: string;
  aboutItems: AboutItem[];
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  howItWorksCards: HowItWorksCard[];
  faqTitle: string;
  faqItems: FAQItem[];
}

interface LandingPageContentStepProps {
  data: LandingPageContent;
  onChange: (data: LandingPageContent) => void;
  showName?: string;
}

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const IconComponent = AVAILABLE_ICONS.find(i => i.name === value)?.icon || Target;
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[100px] bg-[#1A2332] border-white/20 text-white">
        <SelectValue>
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-[#1A2332] border-white/20">
        {AVAILABLE_ICONS.map((item) => (
          <SelectItem key={item.name} value={item.name} className="text-white hover:bg-white/10">
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

export default function LandingPageContentStep({ data, onChange, showName = "the show" }: LandingPageContentStepProps) {
  // About section handlers
  const updateAboutItem = (index: number, field: keyof AboutItem, value: string) => {
    const newItems = [...data.aboutItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...data, aboutItems: newItems });
  };

  const addAboutItem = () => {
    if (data.aboutItems.length < 5) {
      onChange({
        ...data,
        aboutItems: [...data.aboutItems, { icon: "Star", text: "" }],
      });
    }
  };

  const removeAboutItem = (index: number) => {
    onChange({
      ...data,
      aboutItems: data.aboutItems.filter((_, i) => i !== index),
    });
  };

  // How It Works handlers
  const updateHowItWorksCard = (index: number, field: keyof HowItWorksCard, value: string) => {
    const newCards = [...data.howItWorksCards];
    newCards[index] = { ...newCards[index], [field]: value };
    onChange({ ...data, howItWorksCards: newCards });
  };

  // FAQ handlers
  const updateFAQItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...data.faqItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...data, faqItems: newItems });
  };

  const addFAQItem = () => {
    if (data.faqItems.length < 10) {
      onChange({
        ...data,
        faqItems: [...data.faqItems, { question: "", answer: "" }],
      });
    }
  };

  const removeFAQItem = (index: number) => {
    onChange({
      ...data,
      faqItems: data.faqItems.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Landing Page Content</h2>
        <p className="text-white/60">
          Customize the content that appears on your B2C landing page.
        </p>
      </div>

      {/* What's This All About Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-lg text-white">What's This All About?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aboutTitle" className="text-white">Section Title</Label>
            <Input
              id="aboutTitle"
              value={data.aboutTitle}
              onChange={(e) => onChange({ ...data, aboutTitle: e.target.value })}
              placeholder="What's This All About?"
              className="onboarding-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aboutDescription" className="text-white">Description</Label>
            <Textarea
              id="aboutDescription"
              value={data.aboutDescription}
              onChange={(e) => onChange({ ...data, aboutDescription: e.target.value })}
              placeholder={`This is your chance to become part of the action. The Fantasy ${showName} game lets you predict weekly outcomes...`}
              rows={3}
              className="onboarding-input resize-none"
            />
          </div>
          <div className="space-y-3">
            <Label className="text-white">Bullet Points</Label>
            {data.aboutItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <IconSelect
                  value={item.icon}
                  onChange={(v) => updateAboutItem(index, "icon", v)}
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateAboutItem(index, "text", e.target.value)}
                  placeholder="Describe this feature..."
                  className="onboarding-input flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAboutItem(index)}
                  className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {data.aboutItems.length < 5 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addAboutItem}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bullet Point
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-lg text-white">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="howItWorksTitle" className="text-white">Section Title</Label>
              <Input
                id="howItWorksTitle"
                value={data.howItWorksTitle}
                onChange={(e) => onChange({ ...data, howItWorksTitle: e.target.value })}
                placeholder="How It Works"
                className="onboarding-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="howItWorksSubtitle" className="text-white">Subtitle</Label>
              <Input
                id="howItWorksSubtitle"
                value={data.howItWorksSubtitle}
                onChange={(e) => onChange({ ...data, howItWorksSubtitle: e.target.value })}
                placeholder="Follow these simple steps..."
                className="onboarding-input"
              />
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-white">Cards (4 steps)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.howItWorksCards.map((card, index) => (
                <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">Step {index + 1}</span>
                      <IconSelect
                        value={card.icon}
                        onChange={(v) => updateHowItWorksCard(index, "icon", v)}
                      />
                    </div>
                    <Input
                      value={card.title}
                      onChange={(e) => updateHowItWorksCard(index, "title", e.target.value)}
                      placeholder="Step title..."
                      className="onboarding-input"
                    />
                    <Textarea
                      value={card.description}
                      onChange={(e) => updateHowItWorksCard(index, "description", e.target.value)}
                      placeholder="Step description..."
                      rows={2}
                      className="onboarding-input resize-none"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-lg text-white">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="faqTitle" className="text-white">Section Title</Label>
            <Input
              id="faqTitle"
              value={data.faqTitle}
              onChange={(e) => onChange({ ...data, faqTitle: e.target.value })}
              placeholder="Frequently Asked Questions"
              className="onboarding-input"
            />
          </div>
          <div className="space-y-4">
            <Label className="text-white">Questions & Answers</Label>
            {data.faqItems.map((item, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Question {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFAQItem(index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.question}
                    onChange={(e) => updateFAQItem(index, "question", e.target.value)}
                    placeholder="Enter the question..."
                    className="onboarding-input"
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateFAQItem(index, "answer", e.target.value)}
                    placeholder="Enter the answer..."
                    rows={3}
                    className="onboarding-input resize-none"
                  />
                </CardContent>
              </Card>
            ))}
            {data.faqItems.length < 10 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addFAQItem}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
