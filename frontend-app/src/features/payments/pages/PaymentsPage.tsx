import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader/PageHeader";
import { usePayments } from "@/features/payments/hooks/use-payments";
import type { PaymentItem, PaymentStatus, PaymentStatusFilter } from "@/features/payments/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  OVERDUE: {
    label: "Con deuda",
    icon: XCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  EXPIRING_SOON: {
    label: "Por vencer",
    icon: AlertTriangle,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  ACTIVE: {
    label: "Activo",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  PAID: {
    label: "Al día",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

const PaymentBadge = ({ status }: { status: PaymentStatus }) => {
  const cfg = PAYMENT_STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
};

const COLS = "md:grid-cols-[1fr_130px_120px_110px_100px]";

const RowSkeleton = () => (
  <div className={`hidden md:grid ${COLS} gap-4 items-center px-6 py-4 border-b border-border`}>
    <div className="flex items-center gap-3">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-5 w-24 rounded-full" />
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-3 w-16" />
  </div>
);

type StatusTab = { value: PaymentStatusFilter; label: string };

const TABS: StatusTab[] = [
  { value: "ALL", label: "Todos" },
  { value: "OVERDUE", label: "Con deuda" },
  { value: "EXPIRING_SOON", label: "Por vencer" },
  { value: "ACTIVE", label: "Activos" },
  { value: "PAID", label: "Al día" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);

const formatDueDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
};

const PaymentRow = ({
  item,
  onClick,
}: {
  item: PaymentItem;
  onClick: () => void;
}) => (
  <div
    className={`grid grid-cols-1 ${COLS} gap-2 md:gap-4 items-center px-4 md:px-6 py-3 hover:bg-muted/20 transition-colors cursor-pointer`}
    onClick={onClick}
  >
    {/* Alumno */}
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
        {item.studentName
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{item.studentName}</p>
        <p className="text-xs text-muted-foreground truncate">{item.planName}</p>
        <div className="mt-1 md:hidden">
          <PaymentBadge status={item.paymentStatus} />
        </div>
      </div>
    </div>

    {/* Próximo vencimiento */}
    <div className="hidden md:block">
      <p className="text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatDueDate(item.nextDueDate)}
      </p>
      {item.nextAmount !== null && (
        <p className="text-xs text-muted-foreground">{formatCurrency(item.nextAmount)}</p>
      )}
    </div>

    {/* Estado pago */}
    <div className="hidden md:block">
      <PaymentBadge status={item.paymentStatus} />
    </div>

    {/* Cuotas */}
    <div className="hidden md:block text-sm text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
      {item.paidCount}/{item.installmentCount}
    </div>

    {/* Total */}
    <div className="hidden md:block text-sm font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatCurrency(item.totalAmount)}
    </div>
  </div>
);

export const PaymentsPage = () => {
  const navigate = useNavigate();
  const { items, meta, isLoading, page, setPage, search, setSearch, statusFilter, setStatusFilter } =
    usePayments();
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const overdueCount = items.filter((i) => i.paymentStatus === "OVERDUE").length;

  return (
    <div>
      <PageHeader
        title="Cobros"
        description={
          meta
            ? `${meta.total} suscripciones${overdueCount > 0 ? ` · ${overdueCount} con deuda` : ""}`
            : "Gestioná los pagos de tus alumnos"
        }
      />

      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por alumno…"
              className="pl-8 h-9 w-48 text-sm"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === "") {
                  setSearch("");
                  setPage(1);
                }
              }}
            />
          </div>
        </form>
      </div>

      <Card className="overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border bg-card overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {/* Table header */}
          <div
            className={`hidden md:grid ${COLS} gap-4 items-center px-6 py-2.5 bg-muted/20 border-b border-border`}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Alumno / Plan
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Prox. vto.
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Estado
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cuotas
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total
            </span>
          </div>

          {isLoading ? (
            <div>{Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">
                {search ? "No se encontraron cobros" : "Sin cobros en esta categoría"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? "Probá con otro término"
                  : statusFilter === "ALL"
                  ? "Asigná planes a tus alumnos para ver sus cobros"
                  : "Cambiá el filtro para ver otros cobros"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <PaymentRow
                  key={item.subscriptionId}
                  item={item}
                  onClick={() => navigate(`/app/students/${item.studentId}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className="flex flex-col gap-3 px-4 py-3 border-t border-border sm:px-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {items.length} de {meta.total} cobros
              </p>
              {meta.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
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
