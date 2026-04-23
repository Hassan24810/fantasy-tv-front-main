import { isCustomIconUrl } from "@/lib/iconMap";
import { getIconByValue } from "@/components/admin/IconPicker";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface RuleIconProps {
  icon: string | null | undefined;
  className?: string;
  containerClassName?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { container: "w-8 h-8", icon: "h-4 w-4", img: "h-4 w-4" },
  md: { container: "w-10 h-10", icon: "h-5 w-5", img: "h-5 w-5" },
  lg: { container: "w-12 h-12", icon: "h-6 w-6", img: "h-6 w-6" },
};

export function RuleIcon({ icon, className, containerClassName, size = "md" }: RuleIconProps) {
  const sizes = sizeClasses[size];
  
  if (isCustomIconUrl(icon)) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg", sizes.container, containerClassName)}>
        <img
          src={icon!}
          alt="Rule icon"
          className={cn("object-contain rounded", sizes.img, className)}
        />
      </div>
    );
  }

  const IconComponent = getIconByValue(icon ?? "") ?? Star;
  
  return (
    <div className={cn("flex items-center justify-center rounded-lg", sizes.container, containerClassName)}>
      <IconComponent className={cn(sizes.icon, className)} />
    </div>
  );
}

// Simple icon-only variant without container
export function RuleIconOnly({ icon, className }: { icon: string | null | undefined; className?: string }) {
  if (isCustomIconUrl(icon)) {
    return (
      <img
        src={icon!}
        alt="Rule icon"
        className={cn("object-contain", className)}
      />
    );
  }

  const IconComponent = getIconByValue(icon ?? "") ?? Star;
  return <IconComponent className={className} />;
}
