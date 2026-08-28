import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { TrendingUp, Users, CreditCard, AlertCircle, Building2 } from "lucide-react";
import { analyticsApi } from "@/api/analytics.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function shortMonth(month: string) {
  const [, m] = month.split("-");
  return MONTH_LABELS[m] ?? month;
}

const GYM_COLORS = ["#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#fb923c"];

function KpiCard({
  title,
  value,
  icon: Icon,
  sub,
  color = "text-foreground",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-business"],
    queryFn: () => analyticsApi.getBusinessAnalytics().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-48 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 flex items-center gap-2 text-destructive">
        <AlertCircle className="w-5 h-5" />
        Error cargando analytics
      </div>
    );
  }

  const { revenue, students, plans, gyms } = data;

  const chartRevenue = revenue.monthlyRevenue.map((m) => ({
    ...m,
    label: shortMonth(m.month),
  }));

  const gymsSorted = [...gyms].sort((a, b) => b.studentCount - a.studentCount);
  const gymsRevenueSorted = [...gyms].sort((a, b) => b.revenue - a.revenue);
  const activePlans = [...plans].sort((a, b) => b.subscriberCount - a.subscriberCount);

  const hasGyms = gyms.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics del negocio</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen financiero y de alumnos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Facturado total"
          value={fmt(revenue.totalCollected)}
          icon={TrendingUp}
          color="text-green-500"
        />
        <KpiCard
          title="Pendiente de cobro"
          value={fmt(revenue.totalPending)}
          icon={CreditCard}
          color="text-yellow-500"
        />
        <KpiCard
          title="Vencido sin cobrar"
          value={fmt(revenue.totalOverdue)}
          icon={AlertCircle}
          color="text-red-500"
        />
        <KpiCard
          title="Alumnos activos"
          value={`${students.byStatus.ACTIVE ?? 0}`}
          sub={`${students.newLast30Days} nuevos últimos 30 días`}
          icon={Users}
        />
      </div>

      {/* Monthly revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos por mes (últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartRevenue}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
                tickFormatter={(v) =>
                  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K`
                  : `$${v}`
                }
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Ingreso"]}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gym charts */}
      {hasGyms ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alumnos por gimnasio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Alumnos por gimnasio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gymsSorted} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={80} />
                  <Tooltip
                    formatter={(v: number) => [v, "Alumnos"]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="studentCount" radius={[0, 4, 4, 0]}>
                    {gymsSorted.map((_, i) => (
                      <Cell key={i} fill={GYM_COLORS[i % GYM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {students.unassignedToGym > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {students.unassignedToGym} alumno{students.unassignedToGym > 1 ? "s" : ""} sin gimnasio asignado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ingresos por gimnasio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ingresos por gimnasio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gymsRevenueSorted} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={80} />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Ingresos"]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {gymsRevenueSorted.map((_, i) => (
                      <Cell key={i} fill={GYM_COLORS[i % GYM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Building2 className="w-8 h-8" />
            <p className="text-sm">Todavía no tenés gimnasios registrados</p>
            <p className="text-xs">Asigná un gimnasio a tus alumnos para ver analytics por sede</p>
          </CardContent>
        </Card>
      )}

      {/* Plans + Alumnos por plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alumnos por plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activePlans} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={72} />
                <Tooltip
                  formatter={(v: number) => [v, "Alumnos"]}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="subscriberCount" fill="#60a5fa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plans detail table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de planes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 font-medium">Plan</th>
                    <th className="text-right py-2 font-medium">Precio</th>
                    <th className="text-right py-2 font-medium">Alumnos</th>
                    <th className="text-right py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(p.price)}</td>
                      <td className="py-2 text-right tabular-nums">{p.subscriberCount}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                          {p.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
