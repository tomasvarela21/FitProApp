import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { Search, CheckCircle, Flame, Calendar, Timer } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BottomTabInset } from "@/constants/theme";

const todayLocalString = () => new Date().toLocaleDateString("sv-SE");

const REST_DURATIONS = [30, 60, 90, 120] as const;

type StudentItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  subscription: {
    planName: string;
    subscriptionStatus: "ACTIVE" | "EXPIRING_SOON" | "OVERDUE" | "PAID";
    endDate: string;
  } | null;
};

type LastSet = { setNumber: number; reps: number; weight: number | null; rpe: number | null };

type RoutineExercise = {
  id: string;
  sets: number;
  reps: string;
  suggestedWeight: number | null;
  suggestedRpe: number | null;
  lastSets: LastSet[] | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
  };
};

type TodayRoutine = {
  studentRoutineId: string;
  routine: {
    id: string;
    name: string;
    description: string | null;
    routineExercises: RoutineExercise[];
  };
} | null;

export default function HomeScreen() {
  const { user, api } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados del Trainer
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [search, setSearch] = useState("");

  // Estados del Student
  const [todayRoutine, setTodayRoutine] = useState<TodayRoutine>(null);
  const [workoutLogged, setWorkoutLogged] = useState(false);
  const [loggedSets, setLoggedSets] = useState<
    Record<string, Array<{ reps: string; weight: string; rpe: string; completed: boolean }>>
  >({});
  const [streak, setStreak] = useState(0);
  const [trainedToday, setTrainedToday] = useState(false);

  // Rest timer
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(60);

  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) {
      setRestSeconds(null);
      return;
    }
    const id = setTimeout(
      () => setRestSeconds((prev) => (prev !== null ? prev - 1 : null)),
      1000
    );
    return () => clearTimeout(id);
  }, [restSeconds]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === "TRAINER") {
        const res = await api.get("/students", {
          params: { search: search || undefined, limit: 50 },
        });
        setStudents(res.data.data.items || []);
      } else {
        const [routineRes, streakRes] = await Promise.all([
          api.get("/student/today"),
          api.get("/student/streak", { params: { today: todayLocalString() } }),
        ]);
        const routineData = routineRes.data.data;
        setTodayRoutine(routineData);
        setStreak(streakRes.data.data.streak ?? 0);
        setTrainedToday(streakRes.data.data.trainedToday ?? false);

        if (routineData?.routine?.routineExercises) {
          const initialSets: typeof loggedSets = {};
          routineData.routine.routineExercises.forEach((re: RoutineExercise) => {
            initialSets[re.id] = Array.from({ length: re.sets }, (_, i) => ({
              reps: re.lastSets?.[i]?.reps?.toString()
                ?? re.reps.split("x")[1]
                ?? re.reps
                ?? "10",
              weight: re.lastSets?.[i]?.weight?.toString()
                ?? re.suggestedWeight?.toString()
                ?? "",
              rpe: re.lastSets?.[i]?.rpe?.toString() ?? "",
              completed: false,
            }));
          });
          setLoggedSets(initialSets);
        }
      }
    } catch (err) {
      console.error("Error al cargar pantalla de inicio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogWorkout = async () => {
    if (!todayRoutine) return;

    const exercisesPayload = todayRoutine.routine.routineExercises.map((re) => {
      const sets = (loggedSets[re.id] || []).map((s, idx) => ({
        setNumber: idx + 1,
        reps: parseInt(s.reps) || 10,
        weight: parseFloat(s.weight) || null,
        rpe: parseFloat(s.rpe) || re.suggestedRpe || null,
      }));

      return {
        routineExerciseId: re.id,
        sets,
      };
    });

    try {
      setLoading(true);
      await api.post("/student/workout-log", {
        notes: "Completado desde la app móvil",
        date: `${todayLocalString()}T12:00:00`,
        routineExercises: exercisesPayload,
      });
      setWorkoutLogged(true);
      Alert.alert("¡Buen trabajo!", "Entrenamiento registrado correctamente.");
    } catch (err) {
      Alert.alert("Error", "No se pudo registrar el entrenamiento.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSetCompleted = (exerciseId: string, setIndex: number) => {
    const wasCompleted = loggedSets[exerciseId]?.[setIndex]?.completed ?? false;
    setLoggedSets((prev) => {
      const sets = [...(prev[exerciseId] || [])];
      if (sets[setIndex]) {
        sets[setIndex] = { ...sets[setIndex], completed: !sets[setIndex].completed };
      }
      return { ...prev, [exerciseId]: sets };
    });
    if (!wasCompleted) {
      setRestSeconds(restDuration);
    }
  };

  const updateSetField = (
    exerciseId: string,
    setIndex: number,
    field: "reps" | "weight" | "rpe",
    value: string
  ) => {
    setLoggedSets((prev) => {
      const sets = [...(prev[exerciseId] || [])];
      if (sets[setIndex]) {
        sets[setIndex] = { ...sets[setIndex], [field]: value };
      }
      return { ...prev, [exerciseId]: sets };
    });
  };

  if (!user) return null;

  // RENDER TRAINER
  if (user.role === "TRAINER") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Alumnos</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Gestión y estado de tus alumnos
          </ThemedText>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#208AEF" />
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            renderItem={({ item }) => {
              let badgeColor = "#22c55e";
              let statusText = "Activo";

              if (item.subscription?.subscriptionStatus === "OVERDUE") {
                badgeColor = "#ef4444";
                statusText = "Mora";
              } else if (item.subscription?.subscriptionStatus === "EXPIRING_SOON") {
                badgeColor = "#f59e0b";
                statusText = "Por Vencer";
              } else if (!item.subscription) {
                badgeColor = "#6b7280";
                statusText = "Sin Plan";
              }

              return (
                <View style={[styles.studentCard, { borderColor: colors.backgroundElement }]}>
                  <View style={styles.studentInfo}>
                    <ThemedText type="defaultSemiBold">
                      {item.firstName} {item.lastName}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {item.email}
                    </ThemedText>
                    {item.subscription && (
                      <ThemedText type="small" style={{ marginTop: Spacing.half }}>
                        Plan: {item.subscription.planName}
                      </ThemedText>
                    )}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
                    <ThemedText style={{ color: badgeColor, fontSize: 11, fontWeight: "bold" }}>
                      {statusText}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText>No se encontraron alumnos</ThemedText>
              </View>
            }
          />
        )}
      </ThemedView>
    );
  }

  // RENDER STUDENT
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <ThemedText type="title">Rutina del Día</ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Completa tus ejercicios y registralos
              </ThemedText>
            </View>
            {streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: trainedToday ? "#f59e0b20" : colors.backgroundElement }]}>
                <Flame size={16} color="#f59e0b" />
                <ThemedText type="defaultSemiBold" style={{ color: "#f59e0b", fontSize: 16 }}>
                  {streak}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#208AEF" />
        ) : workoutLogged ? (
          <View style={styles.workoutCompletedCard}>
            <CheckCircle size={64} color="#22c55e" />
            <ThemedText type="title" style={{ marginTop: Spacing.two }}>
              ¡Rutina Registrada!
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, textAlign: "center" }}>
              Ya guardamos tu entrenamiento de hoy. ¡A seguir sumando!
            </ThemedText>
          </View>
        ) : todayRoutine ? (
          <View style={{ gap: Spacing.four }}>
            <View style={[styles.routineHeaderCard, { backgroundColor: colors.backgroundElement }]}>
              <Flame size={24} color="#f59e0b" />
              <View>
                <ThemedText type="defaultSemiBold">
                  {todayRoutine.routine.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {todayRoutine.routine.description || "Sin descripción"}
                </ThemedText>
              </View>
            </View>

            {todayRoutine.routine.routineExercises.map((re) => (
              <View key={re.id} style={[styles.exerciseCard, { borderColor: colors.backgroundElement }]}>
                <View style={styles.exerciseInfo}>
                  <ThemedText type="defaultSemiBold">{re.exercise.name}</ThemedText>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    {re.sets} series x {re.reps} repeticiones
                    {re.suggestedWeight ? ` · Sugerido: ${re.suggestedWeight}kg` : ""}
                  </ThemedText>
                  {re.lastSets && re.lastSets.length > 0 && (() => {
                    const maxW = Math.max(...re.lastSets.filter(s => s.weight !== null).map(s => s.weight!));
                    const hint = isFinite(maxW)
                      ? `Última sesión: ${re.lastSets.length} × ${re.lastSets[0].reps} reps @ ${maxW}kg`
                      : `Última sesión: ${re.lastSets.length} × ${re.lastSets[0].reps} reps`;
                    return (
                      <ThemedText type="small" style={{ color: "#208AEF", marginTop: 2 }}>
                        {hint}
                      </ThemedText>
                    );
                  })()}
                </View>

                <View style={styles.setsList}>
                  <View style={[styles.setRow, { paddingBottom: 2 }]}>
                    <ThemedText type="small" style={[styles.setNumber, { color: colors.textSecondary }]}>#</ThemedText>
                    <ThemedText type="small" style={[{ width: 62, textAlign: "center", color: colors.textSecondary }]}>Reps</ThemedText>
                    <ThemedText type="small" style={[{ width: 62, textAlign: "center", color: colors.textSecondary }]}>Kg</ThemedText>
                    <ThemedText type="small" style={[{ width: 44, textAlign: "center", color: colors.textSecondary }]}>RPE</ThemedText>
                    <View style={{ width: 36 }} />
                  </View>
                  {Array.from({ length: re.sets }).map((_, idx) => {
                    const setInfo = loggedSets[re.id]?.[idx] || {
                      reps: "10",
                      weight: "",
                      rpe: "",
                      completed: false,
                    };

                    const activeBorder = setInfo.completed ? "#22c55e" : colors.backgroundSelected;
                    return (
                      <View key={idx} style={styles.setRow}>
                        <ThemedText type="small" style={styles.setNumber}>
                          {idx + 1}
                        </ThemedText>
                        <TextInput
                          style={[styles.setInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: activeBorder }]}
                          keyboardType="numeric"
                          value={setInfo.reps}
                          onChangeText={(val) => updateSetField(re.id, idx, "reps", val)}
                          placeholder="Reps"
                          placeholderTextColor={colors.textSecondary}
                        />
                        <TextInput
                          style={[styles.setInput, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: activeBorder }]}
                          keyboardType="numeric"
                          value={setInfo.weight}
                          onChangeText={(val) => updateSetField(re.id, idx, "weight", val)}
                          placeholder="Kg"
                          placeholderTextColor={colors.textSecondary}
                        />
                        <TextInput
                          style={[styles.setInputSmall, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: activeBorder }]}
                          keyboardType="numeric"
                          value={setInfo.rpe}
                          onChangeText={(val) => updateSetField(re.id, idx, "rpe", val)}
                          placeholder="RPE"
                          placeholderTextColor={colors.textSecondary}
                          maxLength={2}
                        />
                        <TouchableOpacity
                          style={[styles.checkBtn, { backgroundColor: setInfo.completed ? "#22c55e" : colors.backgroundSelected }]}
                          onPress={() => toggleSetCompleted(re.id, idx)}
                        >
                          <CheckCircle size={16} color={setInfo.completed ? "#ffffff" : colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.completeButton} onPress={handleLogWorkout}>
              <ThemedText style={{ color: "#ffffff", fontWeight: "bold" }}>
                Completar Entrenamiento
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={colors.textSecondary} />
            <ThemedText style={{ marginTop: Spacing.two }}>No tenés rutinas asignadas para hoy</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Rest Timer Modal */}
      <Modal
        visible={restSeconds !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRestSeconds(null)}
      >
        <View style={styles.timerOverlay}>
          <View style={[styles.timerCard, { backgroundColor: colors.backgroundElement }]}>
            <Timer size={22} color="#208AEF" />
            <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.one }}>
              Tiempo de descanso
            </ThemedText>

            <View style={styles.timerCircle}>
              <ThemedText style={[styles.timerNumber, { color: "#208AEF" }]}>
                {restSeconds ?? 0}
              </ThemedText>
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                seg
              </ThemedText>
            </View>

            <View style={styles.durationRow}>
              {REST_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationPill,
                    {
                      backgroundColor:
                        restDuration === d ? "#208AEF" : colors.backgroundSelected,
                    },
                  ]}
                  onPress={() => {
                    setRestDuration(d);
                    setRestSeconds(d);
                  }}
                >
                  <ThemedText
                    type="small"
                    style={{ color: restDuration === d ? "#fff" : colors.textSecondary }}
                  >
                    {d}s
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.backgroundSelected }]}
              onPress={() => setRestSeconds(null)}
            >
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Saltar descanso
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
  },
  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  studentInfo: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 99,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: Spacing.two,
  },
  workoutCompletedCard: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  routineHeaderCard: {
    flexDirection: "row",
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.three,
    alignItems: "center",
  },
  exerciseCard: {
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  exerciseInfo: {
    gap: Spacing.half,
  },
  setsList: {
    gap: Spacing.two,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  setNumber: {
    width: 20,
    textAlign: "center" as const,
  },
  setInput: {
    height: 36,
    width: 62,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: "center" as const,
    fontSize: 13,
  },
  setInputSmall: {
    height: 36,
    width: 44,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: "center" as const,
    fontSize: 12,
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: "#208AEF",
    height: 48,
    borderRadius: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 99,
  },
  // Rest timer
  timerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  timerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: "center",
    width: "100%",
    gap: Spacing.two,
  },
  timerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: "#208AEF",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.three,
  },
  timerNumber: {
    fontSize: 52,
    fontWeight: "bold",
  },
  durationRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  durationPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 99,
  },
  skipButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
});
