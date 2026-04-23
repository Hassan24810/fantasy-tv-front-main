import { useShow } from "@/contexts/ShowContext";
import { Lightbulb } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import { parsePointsPerPosition } from "@/lib/eventDisplayUtils";
import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export const B2CRules = () => {
  const { t } = useTranslation();
  const { rules } = useShow();

  const { ref: headerRef, isVisible: headerVisible } =
    useScrollAnimation({ threshold: 0.2 });

  const { ref: gridRef, isVisible: gridVisible } =
    useScrollAnimation({ threshold: 0.1 });

  if (rules.length === 0) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {t("rules.title")}
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <Lightbulb className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              {t("rules.noRules")}
            </p>
            <p className="text-muted-foreground/70 text-sm mt-2">
              {t("rules.checkBackSoon")}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <h2
          ref={headerRef}
          className={cn(
            "text-2xl text-white text-center font-bold mb-6 transition-all duration-700",
            headerVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          {t("rules.knowRules")}
        </h2>

        {/* SLIDER */}
        <div
          ref={gridRef}
          className={cn(
            "transition-all duration-700 delay-100",
            gridVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          )}
        >
          <Swiper
            modules={[Navigation, Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            grabCursor={true}
            style={{ paddingBottom: "40px" }}
            breakpoints={{
              640: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
              1280: { slidesPerView: 4 },
            }}
          >
            {rules.map((rule) => {
              const pointsPerPosition = parsePointsPerPosition(
                rule.points_per_position
              );

              return (
                <SwiperSlide key={rule.id} className="flex h-auto">
                  
                  {/* CARD */}
                  <div
                    className="rounded-2xl border shadow-md pl-4 pr-6 pb-14 pt-8 transition duration-200 backdrop-blur-lg w-full h-full flex"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.01))",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(var(--show-primary-rgb), 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.1)";
                    }}
                  >
                    <div className="flex flex-col w-full">
                      
                      <div className="flex items-start gap-4">
                        <div
                          className=" w-11 h-11 rounded-lg flex  items-center justify-center"
                          style={{
                            background:
                              "rgba(var(--show-primary-rgb), 0.2)",
                          }}
                        >
                          <RuleIconOnly
                            icon={rule.icon}
                            className="w-5 h-5"
                            style={{ color: "var(--show-primary)" }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white">
                            {rule.event_name}
                          </h3>

                          <p className="text-sm text-white mt-0.5 line-clamp-2">
                            {rule.description ||
                              "Score points with this action."}
                          </p>
                        </div>
                      </div>

                      {/* POINTS */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        {pointsPerPosition.map((pts, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "inline-flex items-center text-white px-16 py-1 text-sm font-medium",
                           
                            )}
                          >
                            Point{idx + 1}: {pts}
                          </span>
                        ))}
                      </div>

                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

      </div>
    </section>
  );
};