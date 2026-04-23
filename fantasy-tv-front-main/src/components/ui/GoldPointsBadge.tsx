import { cn } from "@/lib/utils";

interface GoldPointsBadgeProps {
  points: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function GoldPointsBadge({ points, size = "md", className }: GoldPointsBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const isPositive = points >= 0;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full font-bold transition-all duration-200",
        sizeClasses[size],
        isPositive
          ? "bg-gradient-to-br from-gold-light/10 to-gold-dark/10 text-gold border-2 border-gold shadow-[0_0_12px_hsl(45_93%_47%/0.3)]"
          : "bg-gradient-to-br from-destructive/10 to-destructive/5 text-destructive border-2 border-destructive shadow-[0_0_12px_hsl(0_84%_60%/0.3)]",
        className
      )}
    >
      <span className="relative z-10">{isPositive ? `+${points}` : points}</span>
      {/* Inner glow ring effect */}
      <div
        className={cn(
          "absolute inset-0.5 rounded-full opacity-40",
          isPositive
            ? "bg-gradient-to-br from-gold-light/20 to-transparent"
            : "bg-gradient-to-br from-destructive/20 to-transparent"
        )}
      />
    </div>
  );
}
