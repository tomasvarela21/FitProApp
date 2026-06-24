import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { AlertTriangle, Clock, CircleDollarSign, CheckCircle2, X } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BottomTabInset } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type PaymentAlert = {
  subscriptionId: string;
  installmentId: string;
  studentId: string;
  studentName: string;
  planName: string;
  installmentNumber: number;
  amount: number;
  endDate: string;
  daysUntilExpiry: number;
};

type DashboardSummary = {
  stats: {
    total: number;
    active: number;
    invited: number;
    paused: number;
    inactive: number;
  };
  alerts: {
    expired: PaymentAlert[];
    expiringSoon: PaymentAlert[];
  };
};

export default function AlertsScreen() {
  const { user, api } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"expired" | "expiringSoon">("expired");

  // Modal de registro de pago
  const [selectedAlert, setSelectedAlert] = useState<PaymentAlert | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notes, setNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const res = await api.get("/trainers/dashboard-summary");
      setData(res.data.data);
    } catch (err) {
      console.error("Error al cargar alertas del dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const openPaymentModal = (alertItem: PaymentAlert) => {
    setSelectedAlert(alertItem);
    setNotes("");
    setModalVisible(true);
  };

  const closePaymentModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
    setNotes("");
  };

  const handleRegisterPayment = async () => {
    if (!selectedAlert) return;

    setSubmittingPayment(true);
    try {
      await api.post(`/subscriptions/installments/${selectedAlert.installmentId}/pay`, {
        notes: notes || undefined,
        paidAt: new Date().toISOString(),
      });

      Alert.alert("¡Pago Registrado!", "El pago se ha registrado correctamente y el alumno ha sido notificado.");
      closePaymentModal();
      setLoading(true);
      await loadDashboardData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message ?? "No se pudo registrar el pago.";
      Alert.alert("Error", errMsg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatAmount = (num: number) => {
    return `$ ${num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!user) return null;

  const expiredList = data?.alerts?.expired || [];
  const expiringSoonList = data?.alerts?.expiringSoon || [];
  const currentList = activeTab === "expired" ? expiredList : expiringSoonList;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Alertas de Pago</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Control de cuotas pendientes de tus alumnos
        </ThemedText>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.backgroundElement }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "expired" && { borderBottomColor: "#ef4444", borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("expired")}
        >
          <ThemedText
            type="smallBold"
            style={[
              styles.tabText,
              activeTab === "expired" ? { color: "#ef4444" } : { color: colors.textSecondary },
            ]}
          >
            Vencidas / Mora ({expiredList.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "expiringSoon" && { borderBottomColor: "#f59e0b", borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab("expiringSoon")}
        >
          <ThemedText
            type="smallBold"
            style={[
              styles.tabText,
              activeTab === "expiringSoon" ? { color: "#f59e0b" } : { color: colors.textSecondary },
            ]}
          >
            Por Vencer ({expiringSoonList.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#208AEF" />
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.installmentId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOverdue = activeTab === "expired";
            const badgeBg = isOverdue ? "#ef444415" : "#f59e0b15";
            const badgeTextColor = isOverdue ? "#ef4444" : "#f59e0b";
            const Icon = isOverdue ? AlertTriangle : Clock;

            return (
              <View style={[styles.alertCard, { borderColor: colors.backgroundElement }]}>
                <View style={styles.cardInfo}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, marginRight: Spacing.two }}>
                      <ThemedText type="defaultSemiBold">{item.studentName}</ThemedText>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        Plan: {item.planName}
                      </ThemedText>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                      <Icon size={12} color={badgeTextColor} style={{ marginRight: 4 }} />
                      <ThemedText style={{ color: badgeTextColor, fontSize: 11, fontWeight: "bold" }}>
                        {isOverdue
                          ? `Mora: ${Math.abs(item.daysUntilExpiry)} d`
                          : `En: ${item.daysUntilExpiry} d`}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        Cuota #{item.installmentNumber} · Vence: {formatDate(item.endDate)}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={{ color: colors.text, marginTop: 2 }}>
                        {formatAmount(item.amount)}
                      </ThemedText>
                    </View>

                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => openPaymentModal(item)}
                    >
                      <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <ThemedText type="smallBold" style={{ color: "#ffffff", fontSize: 13 }}>
                        Cobrar
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CircleDollarSign size={64} color={colors.textSecondary} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.two }}>
                ¡Todo al día!
              </ThemedText>
              <ThemedText style={{ color: colors.textSecondary, textAlign: "center", marginTop: Spacing.one }}>
                {activeTab === "expired"
                  ? "No hay alumnos en mora o con cuotas vencidas."
                  : "No hay cuotas próximas a vencer en los siguientes 7 días."}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Modal de Registro de Pago */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closePaymentModal}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">Registrar Cobro Manual</ThemedText>
              <TouchableOpacity onPress={closePaymentModal} style={styles.closeBtn}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {selectedAlert && (
              <ScrollView style={styles.modalBody}>
                <View style={{ gap: Spacing.two, marginBottom: Spacing.three }}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Alumno
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">{selectedAlert.studentName}</ThemedText>
                </View>

                <View style={{ gap: Spacing.two, marginBottom: Spacing.three }}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Cuota y Detalle
                  </ThemedText>
                  <ThemedText>
                    Cuota #{selectedAlert.installmentNumber} del plan {selectedAlert.planName}
                  </ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: "#208AEF" }}>
                    Monto: {formatAmount(selectedAlert.amount)}
                  </ThemedText>
                </View>

                <View style={{ gap: Spacing.two, marginBottom: Spacing.four }}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Notas del Cobro (Opcional)
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: colors.text,
                        borderColor: colors.backgroundSelected,
                        backgroundColor: colors.background,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    placeholder="Ej. Pagado por transferencia, efectivo, etc."
                    placeholderTextColor={colors.textSecondary}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleRegisterPayment}
                  disabled={submittingPayment}
                >
                  {submittingPayment ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={{ color: "#ffffff", fontWeight: "bold" }}>
                      Confirmar Cobro
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  tabText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  cardInfo: {
    gap: Spacing.two,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 99,
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff15",
    marginVertical: Spacing.half,
  },
  payButton: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: Spacing.four,
  },
  modalContent: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    maxHeight: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.two,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  modalBody: {
    marginTop: Spacing.three,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    height: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: "#22c55e",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
});
