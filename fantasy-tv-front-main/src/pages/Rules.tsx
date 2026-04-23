import { useMemo, useState } from "react";
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Users,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddRuleSheet } from "@/components/admin/AddRuleSheet";
import { EditRuleSheet } from "@/components/admin/EditRuleSheet";
import { DeleteRuleDialog } from "@/components/admin/DeleteRuleDialog";
import { useAdminShow } from "@/contexts/AdminShowContext";
import { useRules, type Rule } from "@/hooks/useRules";
import { RuleHoverCard } from "@/components/admin/RuleHoverCard";
import { RuleIconOnly } from "@/components/ui/RuleIcon";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function RulesContent() {
  const { show, shows, isLoading: showLoading } = useAdminShow();
  const { rules, isLoading, addRule, updateRule, deleteRule } = useRules({ showId: show?.id });
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [sortColumn, setSortColumn] = useState<"rule" | "points" | "participants" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const itemsPerPage = 15;

  const handleSort = (column: "rule" | "points" | "participants") => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: "rule" | "points" | "participants") => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = rules;
    
    if (q) {
      result = rules.filter((r) => {
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.template.toLowerCase().includes(q)
        );
      });
    }

    // Apply sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        switch (sortColumn) {
          case "rule":
            comparison = a.title.localeCompare(b.title);
            break;
          case "points":
            comparison = a.points - b.points;
            break;
          case "participants":
            comparison = a.participantsCount - b.participantsCount;
            break;
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [rules, searchQuery, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / itemsPerPage));
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (rule: Rule) => {
    setSelectedRule(rule);
    setIsEditOpen(true);
  };

  const handleDelete = (rule: Rule) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  };


  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('nav.rules')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('admin.scoringRules', { name: show?.name ?? '' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-64 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            {t('admin.addRule')}
          </Button>
        </div>
      </div>

      {showLoading || isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          {t('admin.loadingRules')}
        </div>
      ) : !show ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-900 font-medium">{t('admin.noShowFound')}</p>
          <p className="text-slate-500 text-sm mt-1">
            {t('admin.completeOnboarding')}
          </p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-900 font-medium">{t('admin.noRulesAdded')}</p>
          <p className="text-slate-500 text-sm mt-1">
            {t('admin.addRulesDescription')}
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            className="mt-6 bg-primary hover:bg-primary/90 text-white"
          >
            {t('admin.addRule')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead 
                  className="w-[40%] text-slate-500 font-medium text-xs uppercase tracking-wider py-5 pl-6 pr-4 text-left align-middle cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("rule")}
                >
                  <div className="flex items-center gap-1.5">
                    {t('admin.rule')}
                    {getSortIcon("rule")}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[15%] text-slate-500 font-medium text-xs uppercase tracking-wider py-5 px-2 text-center align-middle cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("points")}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {t('admin.points')}
                    {getSortIcon("points")}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-[20%] text-slate-500 font-medium text-xs uppercase tracking-wider py-5 px-2 text-center align-middle cursor-pointer hover:text-slate-700 transition-colors select-none"
                  onClick={() => handleSort("participants")}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {t('nav.participants')}
                    {getSortIcon("participants")}
                  </div>
                </TableHead>
                <TableHead className="w-[25%] text-slate-500 font-medium text-xs uppercase tracking-wider py-5 pl-2 pr-6 text-right align-middle">
                  {t('admin.action')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRules.map((rule) => {
                const pointsPerPosition = rule.pointsPerPosition || [rule.points];
                return (
                  <TableRow
                    key={rule.id}
                    className="border-b border-slate-50 transition-colors duration-150 hover:bg-slate-50/70"
                  >
                    <TableCell className="w-[40%] py-5 pl-6 pr-4 align-middle">
                      <RuleHoverCard rule={rule} icon={rule.icon}>
                        <div className="flex items-center gap-4 cursor-pointer">
                          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 border border-slate-100">
                            <RuleIconOnly icon={rule.icon} className="h-5 w-5 text-slate-500" />
                          </div>
                          <span className="text-slate-800 font-medium leading-snug line-clamp-2">
                            {rule.title}
                          </span>
                        </div>
                      </RuleHoverCard>
                    </TableCell>
                    <TableCell className="w-[15%] py-5 px-2 align-middle">
                      <div className="flex justify-center items-center gap-1">
                        {pointsPerPosition.map((pts, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              "inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-semibold",
                              pts >= 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {pts >= 0 ? "+" : ""}{pts}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="w-[20%] py-5 px-2 align-middle">
                      <div className="flex items-center justify-center gap-1.5 text-slate-500">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">{rule.participantsCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[25%] py-5 pl-2 pr-6 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(rule);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(rule);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-center py-5 border-t border-slate-100 gap-4">
            <span className="text-sm text-slate-500">
              {t('admin.totalItems', { count: filteredRules.length })}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "bg-primary text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <AddRuleSheet open={isAddOpen} onOpenChange={setIsAddOpen} onAdd={addRule} />
      <EditRuleSheet
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        rule={selectedRule}
        onUpdate={updateRule}
      />
      <DeleteRuleDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        rule={selectedRule}
        onDelete={deleteRule}
      />
    </>
  );
}

export default function Rules() {
  return (
    <AdminLayout>
      <RulesContent />
    </AdminLayout>
  );
}
