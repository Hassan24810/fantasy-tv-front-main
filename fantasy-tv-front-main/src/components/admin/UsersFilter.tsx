import { useState } from "react";
import { ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface FilterState {
  totalPointsMin: number | null;
  totalPointsMax: number | null;
  gwPointsMin: number | null;
  gwPointsMax: number | null;
  gender: string | null;
}

interface UsersFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function UsersFilter({ filters, onFiltersChange, onClearFilters }: UsersFilterProps) {
  const [totalPointsOpen, setTotalPointsOpen] = useState(true);
  const [gwPointsOpen, setGwPointsOpen] = useState(true);
  const [genderOpen, setGenderOpen] = useState(true);

  const [totalPointsRange, setTotalPointsRange] = useState<[number, number]>([
    filters.totalPointsMin ?? 0,
    filters.totalPointsMax ?? 200,
  ]);
  const [gwPointsRange, setGwPointsRange] = useState<[number, number]>([
    filters.gwPointsMin ?? 0,
    filters.gwPointsMax ?? 200,
  ]);

  const handleTotalPointsChange = (values: number[]) => {
    setTotalPointsRange([values[0], values[1]]);
    onFiltersChange({
      ...filters,
      totalPointsMin: values[0],
      totalPointsMax: values[1],
    });
  };

  const handleGwPointsChange = (values: number[]) => {
    setGwPointsRange([values[0], values[1]]);
    onFiltersChange({
      ...filters,
      gwPointsMin: values[0],
      gwPointsMax: values[1],
    });
  };

  const handleGenderSelect = (gender: string) => {
    onFiltersChange({
      ...filters,
      gender: filters.gender === gender ? null : gender,
    });
  };

  const removeFilter = (filterKey: keyof FilterState) => {
    if (filterKey === "totalPointsMin" || filterKey === "totalPointsMax") {
      setTotalPointsRange([0, 200]);
      onFiltersChange({
        ...filters,
        totalPointsMin: null,
        totalPointsMax: null,
      });
    } else if (filterKey === "gwPointsMin" || filterKey === "gwPointsMax") {
      setGwPointsRange([0, 200]);
      onFiltersChange({
        ...filters,
        gwPointsMin: null,
        gwPointsMax: null,
      });
    } else {
      onFiltersChange({
        ...filters,
        [filterKey]: null,
      });
    }
  };

  const hasActiveFilters =
    filters.totalPointsMin !== null ||
    filters.totalPointsMax !== null ||
    filters.gwPointsMin !== null ||
    filters.gwPointsMax !== null ||
    filters.gender !== null;

  const appliedFilters = [];
  if (filters.totalPointsMin !== null) {
    appliedFilters.push({ key: "totalPointsMin", label: `Min ${filters.totalPointsMin} pt` });
  }
  if (filters.totalPointsMax !== null) {
    appliedFilters.push({ key: "totalPointsMax", label: `Max ${filters.totalPointsMax} pt` });
  }
  if (filters.gwPointsMin !== null || filters.gwPointsMax !== null) {
    appliedFilters.push({
      key: "gwPointsMin",
      label: `Points (This Round): ${filters.gwPointsMax ?? 200} pt`,
    });
  }
  if (filters.gender) {
    appliedFilters.push({ key: "gender", label: `Gender: ${filters.gender}` });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Filter</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Points (This Season) */}
        <Collapsible open={totalPointsOpen} onOpenChange={setTotalPointsOpen}>
          <div className="border border-slate-200 rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left">
              <span className="text-sm font-medium text-slate-700">Total Points (This Season)</span>
              <ChevronUp
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform",
                  !totalPointsOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="pt-2">
                <Slider
                  value={totalPointsRange}
                  onValueChange={handleTotalPointsChange}
                  max={200}
                  min={0}
                  step={1}
                  className="mb-4"
                />
                <div className="flex gap-3">
                  <Input
                    placeholder="Min Pt"
                    value={totalPointsRange[0] || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleTotalPointsChange([val, totalPointsRange[1]]);
                    }}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                  <Input
                    placeholder="Max Pt"
                    value={totalPointsRange[1] || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 200;
                      handleTotalPointsChange([totalPointsRange[0], val]);
                    }}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Game Round Points */}
        <Collapsible open={gwPointsOpen} onOpenChange={setGwPointsOpen}>
          <div className="border border-slate-200 rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left">
              <span className="text-sm font-medium text-slate-700">Game Round Points</span>
              <ChevronUp
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform",
                  !gwPointsOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="pt-2">
                <Slider
                  value={gwPointsRange}
                  onValueChange={handleGwPointsChange}
                  max={200}
                  min={0}
                  step={1}
                  className="mb-4"
                />
                <div className="flex gap-3">
                  <Input
                    placeholder="Min Pt"
                    value={gwPointsRange[0] || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleGwPointsChange([val, gwPointsRange[1]]);
                    }}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                  <Input
                    placeholder="Max Pt"
                    value={gwPointsRange[1] || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 200;
                      handleGwPointsChange([gwPointsRange[0], val]);
                    }}
                    className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Gender */}
        <Collapsible open={genderOpen} onOpenChange={setGenderOpen}>
          <div className="border border-slate-200 rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left">
              <span className="text-sm font-medium text-slate-700">Gender</span>
              <ChevronUp
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform",
                  !genderOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="pt-2 space-y-2">
                {["Male", "Female", "Other"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => handleGenderSelect(gender)}
                    className={cn(
                      "block w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      filters.gender === gender
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Applied Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          <span className="text-sm font-medium text-slate-700">Applied Filter</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {appliedFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-full"
              >
                {filter.label}
                <button
                  type="button"
                  onClick={() => removeFilter(filter.key as keyof FilterState)}
                  className="hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Clear Filter
          </Button>
        </div>
      )}
    </div>
  );
}