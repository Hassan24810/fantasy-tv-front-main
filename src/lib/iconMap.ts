import {
  LucideIcon,
  Users,
  Heart,
  Star,
  Trophy,
  Gift,
  Smile,
  ThumbsUp,
  Zap,
  MessageCircle,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  users: Users,
  heart: Heart,
  star: Star,
  trophy: Trophy,
  gift: Gift,
  smile: Smile,
  thumbsup: ThumbsUp,
  zap: Zap,
  message: MessageCircle,
  // Legacy mappings from event_type
  romance: Heart,
  drama: MessageCircle,
  competition: Trophy,
  elimination: Zap,
  social: Users,
};

export const getIconComponent = (iconName: string | null | undefined): LucideIcon | null => {
  // If it's a URL (custom icon), return null - the caller should handle URL icons separately
  if (iconName?.startsWith("http://") || iconName?.startsWith("https://")) {
    return null;
  }
  return iconMap[iconName ?? "star"] ?? Star;
};

export const isCustomIconUrl = (iconName: string | null | undefined): boolean => {
  return Boolean(iconName?.startsWith("http://") || iconName?.startsWith("https://"));
};
