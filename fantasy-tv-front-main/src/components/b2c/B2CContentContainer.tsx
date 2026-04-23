import { cn } from "@/lib/utils";

interface B2CContentContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "5xl" | "6xl" | "7xl";
}

export const B2CContentContainer = ({
  children,
  className,
  maxWidth = "7xl",
}: B2CContentContainerProps) => {
  const maxWidthClass = {
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    "8xl": "max-w-8xl",
    "9xl": "max-w-9xl",
    "10xl": "max-w-10xl",
  }[maxWidth];

  return (
    <div
      className={cn(
        maxWidthClass,
        "mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
        className
      )}
    >
      {children}
    </div>
  );
};
