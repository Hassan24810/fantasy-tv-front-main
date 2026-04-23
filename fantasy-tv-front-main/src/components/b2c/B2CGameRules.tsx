import { useShow } from "@/contexts/ShowContext";
import { ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import { parsePointsPerPosition } from "@/lib/eventDisplayUtils";
import { cn } from "@/lib/utils";

/**
 * Dashboard-only Game Rules grid (2 columns desktop, 1 column mobile).
 * Landing page continues to use <B2CRules /> unchanged.
 */
export const B2CGameRules = () => {
  const { t } = useTranslation();
  const { rules } = useShow();

  if (rules.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-2xl border border-slate-300 bg-white p-4 md:p-6">
            <h2 className="mb-6 text-xl font-bold text-slate-900 md:text-2xl">
              {t("rules.gameRulesHeading")}
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
              <ScrollText className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg text-slate-600">{t("rules.noRules")}</p>
              <p className="mt-2 text-sm text-slate-500">{t("rules.checkBackSoon")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-300 bg-white p-3 max-md:px-3 max-md:py-4 md:p-6">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900 md:mb-8 md:text-2xl">
            {t("rules.gameRulesHeading")}
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-5">
          {rules.map((rule) => {
            const pointsPerPosition = parsePointsPerPosition(rule.points_per_position);

            return (
              <article
                key={rule.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <RuleIconOnly
                    icon={rule.icon}
                    className="h-6 w-6 shrink-0 text-[rgb(var(--show-primary-rgb))]"
                  />
                  <h3 className="text-2xl font-bold leading-none text-slate-900">
                    {rule.event_name}
                  </h3>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  {rule.description?.trim() || t("rules.defaultDescription")}
                </p>

                {pointsPerPosition.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {pointsPerPosition.map((pts, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
                          pts >= 0
                            ? "bg-[#E8F5E9] text-[#2E7D32]"
                            : "bg-[#FFEBEE] text-[#C62828]"
                        )}
                      >
                        {t("rules.participantBadge", {
                          position: idx + 1,
                          signedPoints: `${pts >= 0 ? "+" : ""}${pts}`,
                        })}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};
