import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Eye, Pencil, MoreHorizontal, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { studentsApi } from "@/api/students.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge/StatusBadge";
import { CreateStudentSheet } from "@/features/students/components/CreateStudentSheet";
import { StudentDetailSheet } from "@/features/students/components/StudentDetailSheet";
import { useStudents, type StudentStatusFilter } from "@/features/students/hooks/use-students";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import type { Student } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type StatusTab = {
  value: StudentStatusFilter;
  label: string;
  count?: number;
};

const SubscriptionBadge = ({ subscription }: { subscription: Student["subscription"] }) => {
  if (!subscription)
    return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs">Sin plan</Badge>;
  if (subscription.subscriptionStatus === "OVERDUE")
    return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1 text-xs"><XCircle className="w-3 h-3" />Con deuda</Badge>;
  if (subscription.subscriptionStatus === "EXPIRING_SOON")
    return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1 text-xs"><AlertTriangle className="w-3 h-3" />Por vencer</Badge>;
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />{subscription.planName}</Badge>;
};

const COLS = "md:grid-cols-[1fr_70px_110px_100px_130px_90px]";

const RowSkeleton = () => (
  <div className={`hidden md:grid ${COLS} gap-4 items-center px-6 py-4 border-b border-border`}>
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-24" /></div>
    </div>
    <Skeleton className="h-3 w-8" />
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-5 w-20 rounded-full" />
    <Skeleton className="h-5 w-24 rounded-full" />
    <Skeleton className="h-6 w-20 rounded-md" />
  </div>
);

export const StudentsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { students, meta, isLoading, page, setPage, search, setSearch, statusFilter, setStatusFilter } = useStudents();
  const { data: dashboardData } = useDashboard();
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId || isLoading || students.length === 0) return;
    const match = students.find((s) => s.id === highlightId);
    if (match) {
      setSelectedStudent(match);
      setSearchParams({}, { replace: true });
    }
  }, [students, isLoading]);

  const stats = dashboardData?.stats;
  const tabs: StatusTab[] = [
    { value: "ALL",      label: "Todos",    count: stats?.total },
    { value: "ACTIVE",   label: "Activos",  count: stats?.active },
    { value: "INVITED",  label: "Invitados",count: stats?.invited },
    { value: "PAUSED",   label: "Pausados", count: stats?.paused },
  ];

  const subtitle = stats
    ? `${stats.total} alumnos · ${stats.active} activos · ${stats.invited} invitados · ${stats.paused} pausados`
    : "Gestioná tus alumnos";

  const handleRowHover = (studentId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["student-summary", studentId],
      queryFn: () => studentsApi.getSummary(studentId).then((r) => r.data.data),
      staleTime: 1000 * 60 * 2,
    });
  };

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTabChange = (value: StudentStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">Alumnos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre…"
                className="pl-8 h-9 w-48 text-sm"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === "") { setSearch(""); setPage(1); }
                }}
              />
            </div>
          </form>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Agregar alumno
          </Button>
        </div>
      </div>

      <CreateStudentSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <StudentDetailSheet student={selectedStudent} open={!!selectedStudent} onClose={() => setSelectedStudent(null)} />

      <Card className="overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border bg-card">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 text-xs ${statusFilter === tab.value ? "text-primary" : "text-muted-foreground"}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {/* Table header */}
          <div className={`hidden md:grid ${COLS} gap-4 items-center px-6 py-2.5 bg-muted/20 border-b border-border`}>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alumno</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ses.</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Últ. sesión</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</span>
          </div>

          {isLoading ? (
            <div>{Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">
                {search ? "No se encontraron alumnos" : "No hay alumnos en esta categoría"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Probá con otro término" : statusFilter === "ALL" ? "Creá tu primer alumno con el botón de arriba" : "Cambiá el filtro para ver otros alumnos"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`grid grid-cols-1 ${COLS} gap-2 md:gap-4 items-center px-4 md:px-6 py-3 hover:bg-muted/20 transition-colors cursor-pointer`}
                  onClick={() => setSelectedStudent(student)}
                  onMouseEnter={() => handleRowHover(student.id)}
                >
                  {/* Alumno */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1 md:hidden">
                        <StatusBadge status={student.status} />
                        <SubscriptionBadge subscription={student.subscription} />
                      </div>
                    </div>
                  </div>

                  {/* Sesiones */}
                  <span className="text-sm font-medium hidden md:block" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {student.sessionsCount}
                  </span>

                  {/* Últ. sesión */}
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {student.lastSessionDate
                      ? formatDistanceToNow(new Date(student.lastSessionDate), { locale: es, addSuffix: true })
                      : "—"}
                  </span>

                  {/* Estado */}
                  <div onClick={(e) => e.stopPropagation()} className="hidden md:block">
                    <StatusBadge status={student.status} />
                  </div>

                  {/* Plan */}
                  <div onClick={(e) => e.stopPropagation()} className="hidden md:block">
                    <SubscriptionBadge subscription={student.subscription} />
                  </div>

                  {/* Acciones */}
                  <div className="hidden md:flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Ver detalle"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Editar"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Más opciones"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className="flex flex-col gap-3 px-4 py-3 border-t border-border sm:px-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {students.length} de {meta.total} alumnos
              </p>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    ←
                  </Button>
                  {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>
                    →
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
