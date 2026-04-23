import React, { useState, useEffect } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { B2CParticipants } from "@/components/b2c/B2CParticipants";
import { B2CRules } from "@/components/b2c/B2CRules";
import { cn } from "@/lib/utils";
import { SkipScrollAnimationContext } from "@/hooks/useScrollAnimation";

interface OnboardingPreviewPanelProps {
  currentStep: number;
}

type PreviewPage = "hjem" | "deltakere" | "poengsystem";
type DeviceMode = "desktop" | "mobile";

const STEP_TO_PAGE: Record<number, PreviewPage> = {
  1: "hjem",
  2: "hjem",
  3: "deltakere",
  4: "poengsystem",
  5: "hjem",
};

/**
 * Live preview panel that renders B2C components scaled down
 * in the right side of the onboarding split-screen layout.
 */
export const OnboardingPreviewPanel: React.FC<OnboardingPreviewPanelProps> = ({
  currentStep,
}) => {
  const [activePage, setActivePage] = useState<PreviewPage>("hjem");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");

  // Auto-switch page based on step
  useEffect(() => {
    const mapped = STEP_TO_PAGE[currentStep] || "hjem";
    setActivePage(mapped);
  }, [currentStep]);

  const pages: { key: PreviewPage; label: string }[] = [
    { key: "hjem", label: "Hjem" },
    { key: "deltakere", label: "Deltakere" },
    { key: "poengsystem", label: "Poengsystem" },
  ];

  const renderPreviewContent = () => {
    switch (activePage) {
      case "deltakere":
        return <B2CParticipants />;
      case "poengsystem":
        return <B2CRules />;
      case "hjem":
      default:
        return (
          <div className="p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Monitor className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Dashboard Preview</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hjemmesiden vises her med lagoppstilling, poeng og oppdateringer etter publisering.
                </p>
              </div>
              {/* Mock team slots */}
              <div className="flex justify-center gap-3 pt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-muted border-2 border-dashed border-border" />
                    <span className="text-[10px] text-muted-foreground">Plass {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  const isMobile = deviceMode === "mobile";

  return (
    <div className="h-full flex flex-col">
      {/* Banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-medium text-primary">
          Forhåndsvisning — slik ser brukerne din side
        </span>
        {/* Device Toggle */}
        <div className="flex items-center bg-background rounded-lg p-0.5 border border-border">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              !isMobile
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              isMobile
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobil
          </button>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-border bg-background flex-shrink-0">
        {pages.map((page) => (
          <button
            key={page.key}
            onClick={() => setActivePage(page.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              activePage === page.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-hidden bg-[hsl(220,14%,96%)] flex items-start justify-center p-4">
        <div
          className={cn(
            "bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300",
            isMobile ? "w-[390px]" : "w-full"
          )}
          style={isMobile ? {
            boxShadow: "0 0 0 8px hsl(220 9% 46% / 0.15), 0 20px 60px -12px hsl(222 47% 11% / 0.25)",
            borderRadius: "2rem",
          } : undefined}
        >
          {/* Phone notch for mobile */}
          {isMobile && (
            <div className="bg-foreground/90 h-7 flex items-center justify-center">
              <div className="w-20 h-4 rounded-full bg-foreground/80" />
            </div>
          )}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: isMobile ? "calc(100vh - 280px)" : "calc(100vh - 220px)",
            }}
          >
            <ErrorBoundary>
              <SkipScrollAnimationContext.Provider value={true}>
                {renderPreviewContent()}
              </SkipScrollAnimationContext.Provider>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Simple error boundary to prevent preview crashes from taking down the admin panel */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Forhåndsvisning kunne ikke lastes. Fortsett med oppsettet.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
