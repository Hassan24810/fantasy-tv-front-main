import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { languages, type LanguageCode, persistLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";

interface LanguageSectionProps {
  language: LanguageCode;
  onSave: (updates: { language: LanguageCode }) => Promise<void>;
}

export const LanguageSection = ({ language, onSave }: LanguageSectionProps) => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = async (newLanguage: LanguageCode) => {
    await onSave({ language: newLanguage });
    i18n.changeLanguage(newLanguage);
    persistLanguage(newLanguage);
  };

  return (
    <Card className="bg-card text-card-foreground border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('settings.language')}
        </CardTitle>
        <CardDescription>
          {t('settings.selectLanguage')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t('settings.language')}</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
