import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock, CircleDollarSign } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BottomTabInset } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type Installment = {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
  notes: string | null;
};

type SubscriptionDetail = {
  id: string;
  planName: string;
  planDuration: string;
  frequency: "MONTHLY" | "BIWEEKLY";
  totalAmount: number;
  installmentCount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  nextInstallment: {
    id: string;
    number: number;
    amount: number;
    dueDate: string;
    status: "PENDING" | "OVERDUE";
  } | null;
  installments: Installment[];
};

export default function FeesScreen() {
  const { user, api } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subData, setSubData] = useState<SubscriptionDetail | null>(null);

  const loadSubscription = async () => {
    if (!user) return;
    try {
      const res = await api.get("/student/subscription");
      setSubData(res.data.data);
    } catch (err) {
      console.error("Error al cargar cuotas de alumno:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscription();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatAmount = (num: number) => {
    return `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const mapFrequency = (freq: "MONTHLY" | "BIWEEKLY") => {
    return freq === "MONTHLY" ? "Mensual" : "Quincenal";
  };

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Mis Cuotas</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Estado de tu plan y registro de pagos
        </ThemedText>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#208AEF" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {subData ? (
            <View style={{ gap: Spacing.four, paddingHorizontal: Spacing.four }}>
              {/* Resumen del Plan */}
              <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <CreditCard size={20} color="#208AEF" />
                  <ThemedText type="defaultSemiBold" style={{ marginLeft: Spacing.two }}>
                    {subData.planName}
                  </ThemedText>
                </View>

                <View style={styles.divider} />

                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Frecuencia
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {mapFrequency(subData.frequency)}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Monto Total
                    </ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {formatAmount(subData.totalAmount)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.grid}>
                  <View style={styles.gridItem}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Pagado
                    </ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ color: "#22c55e" }}>
                      {formatAmount(subData.paidAmount)}
                    </ThemedText>
                  </View>
                  <View style={styles.gridItem}>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Pendiente
                    </ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={{ color: subData.pendingAmount > 0 ? "#ef4444" : colors.text }}
                    >
                      {formatAmount(subData.pendingAmount)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Vence el {formatDate(subData.endDate)}
                  </ThemedText>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          subData.status === "ACTIVE"
                            ? "#22c55e20"
                            : "#ef444420",
                      },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        fontSize: 11,
                        color: subData.status === "ACTIVE" ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {subData.status === "ACTIVE" ? "Activo" : "Expirado"}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Alerta de Próximo Pago */}
              {subData.nextInstallment && (
                <View
                  style={[
                    styles.alertCard,
                    {
                      borderColor: subData.nextInstallment.status === "OVERDUE" ? "#ef4444" : "#f59e0b",
                      backgroundColor: subData.nextInstallment.status === "OVERDUE" ? "#ef444410" : "#f59e0b10",
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", gap: Spacing.two, alignItems: "center" }}>
                    {subData.nextInstallment.status === "OVERDUE" ? (
                      <AlertTriangle size={20} color="#ef4444" />
                    ) : (
                      <Clock size={20} color="#f59e0b" />
                    )}
                    <ThemedText type="defaultSemiBold">
                      {subData.nextInstallment.status === "OVERDUE" ? "Cuota Vencida" : "Próximo Vencimiento"}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ marginTop: Spacing.one, color: colors.text }}>
                    Cuota Nº {subData.nextInstallment.number} de {formatAmount(subData.nextInstallment.amount)} vence el{" "}
                    {formatDate(subData.nextInstallment.dueDate)}.
                  </ThemedText>
                </View>
              )}

              {/* Historial de Cuotas */}
              <View>
                <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>
                  Detalle de Cuotas
                </ThemedText>

                {subData.installments.map((installment) => {
                  let badgeBg = "#6b728020";
                  let badgeTextColor = "#6b7280";
                  let badgeText = "Pendiente";
                  let Icon = Clock;

                  if (installment.status === "PAID") {
                    badgeBg = "#22c55e20";
                    badgeTextColor = "#22c55e";
                    badgeText = "Pagado";
                    Icon = CheckCircle2;
                  } else if (installment.status === "OVERDUE") {
                    badgeBg = "#ef444420";
                    badgeTextColor = "#ef4444";
                    badgeText = "Vencido";
                    Icon = AlertTriangle;
                  }

                  return (
                    <View
                      key={installment.id}
                      style={[
                        styles.installmentRow,
                        { borderColor: colors.backgroundElement },
                      ]}
                    >
                      <View style={{ flex: 1, gap: Spacing.half }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.one }}>
                          <ThemedText type="defaultSemiBold">
                            Cuota #{installment.number}
                          </ThemedText>
                          <ThemedText type="defaultSemiBold" style={{ color: "#208AEF" }}>
                            {formatAmount(installment.amount)}
                          </ThemedText>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.one }}>
                          <Calendar size={13} color={colors.textSecondary} />
                          <ThemedText type="small" style={{ color: colors.textSecondary }}>
                            Vence: {formatDate(installment.dueDate)}
                          </ThemedText>
                        </View>

                        {installment.paidAt && (
                          <ThemedText type="small" style={{ color: "#22c55e" }}>
                            Pagado el: {formatDate(installment.paidAt)}
                          </ThemedText>
                        )}

                        {installment.notes && (
                          <ThemedText type="small" style={{ fontStyle: "italic", color: colors.textSecondary, marginTop: Spacing.half }}>
                            Nota: {installment.notes}
                          </ThemedText>
                        )}
                      </View>

                      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Icon size={12} color={badgeTextColor} style={{ marginRight: 4 }} />
                        <ThemedText style={{ color: badgeTextColor, fontSize: 11, fontWeight: "bold" }}>
                          {badgeText}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <CircleDollarSign size={64} color={colors.textSecondary} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.two, textAlign: "center" }}>
                Sin Plan Asignado
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary, textAlign: "center", marginTop: Spacing.one }}>
                No tenés un plan activo o cuotas asociadas en este momento. Consultá con tu entrenador.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff20",
    marginVertical: Spacing.half,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  gridItem: {
    flex: 1,
    gap: Spacing.half,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 99,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  installmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: Spacing.six,
  },
});
