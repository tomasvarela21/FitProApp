import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { User, Mail, Phone, Sun, Moon, Monitor, LogOut, ShieldAlert, Award } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BottomTabInset } from "@/constants/theme";
import { useColorScheme, useThemePreference, ThemeMode } from "@/hooks/use-color-scheme";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  trainer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

export default function ProfileScreen() {
  const { user, logout, api } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const { themeMode, setThemeMode } = useThemePreference();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const endpoint = user.role === "TRAINER" ? "/trainers/profile" : "/student/profile";
      const res = await api.get(endpoint);
      setProfile(res.data.data);
    } catch (err) {
      console.error("Error al obtener perfil:", err);
      // Fallback a los datos de la sesión
      setProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const selectTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Mi Perfil</ThemedText>
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Administrá tus datos y preferencias
        </ThemedText>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#208AEF" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {profile && (
            <View style={{ gap: Spacing.four, paddingHorizontal: Spacing.four }}>
              {/* Información Personal */}
              <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.avatarRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.backgroundSelected }]}>
                    <User size={36} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">
                      {profile.firstName} {profile.lastName}
                    </ThemedText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Award size={14} color="#208AEF" />
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        {user.role === "TRAINER" ? "Entrenador" : "Alumno / Cliente"}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Email */}
                <View style={styles.infoItem}>
                  <Mail size={18} color={colors.textSecondary} />
                  <View>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Correo Electrónico
                    </ThemedText>
                    <ThemedText style={styles.infoValue}>{profile.email}</ThemedText>
                  </View>
                </View>

                {/* Teléfono */}
                <View style={styles.infoItem}>
                  <Phone size={18} color={colors.textSecondary} />
                  <View>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      Teléfono
                    </ThemedText>
                    <ThemedText style={styles.infoValue}>
                      {profile.phone || "No registrado"}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Información del Entrenador (Para alumnos) */}
              {user.role === "STUDENT" && profile.trainer && (
                <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>
                    Mi Entrenador
                  </ThemedText>
                  <View style={styles.infoItem}>
                    <User size={18} color={colors.textSecondary} />
                    <View>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        Nombre
                      </ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {profile.trainer.firstName} {profile.trainer.lastName}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Mail size={18} color={colors.textSecondary} />
                    <View>
                      <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        Email
                      </ThemedText>
                      <ThemedText style={styles.infoValue}>{profile.trainer.email}</ThemedText>
                    </View>
                  </View>
                  {profile.trainer.phone && (
                    <View style={styles.infoItem}>
                      <Phone size={18} color={colors.textSecondary} />
                      <View>
                        <ThemedText type="small" style={{ color: colors.textSecondary }}>
                          Teléfono
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>{profile.trainer.phone}</ThemedText>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Selector de Tema */}
              <View style={[styles.sectionCard, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.three }}>
                  Apariencia
                </ThemedText>

                <View style={styles.themeRow}>
                  {/* Modo Claro */}
                  <TouchableOpacity
                    style={[
                      styles.themeOption,
                      themeMode === "light" && [styles.themeSelected, { borderColor: "#208AEF" }],
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => selectTheme("light")}
                  >
                    <Sun size={20} color={themeMode === "light" ? "#208AEF" : colors.textSecondary} />
                    <ThemedText
                      type="small"
                      style={themeMode === "light" ? { color: "#208AEF", fontWeight: "bold" } : { color: colors.textSecondary }}
                    >
                      Claro
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Modo Oscuro */}
                  <TouchableOpacity
                    style={[
                      styles.themeOption,
                      themeMode === "dark" && [styles.themeSelected, { borderColor: "#208AEF" }],
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => selectTheme("dark")}
                  >
                    <Moon size={20} color={themeMode === "dark" ? "#208AEF" : colors.textSecondary} />
                    <ThemedText
                      type="small"
                      style={themeMode === "dark" ? { color: "#208AEF", fontWeight: "bold" } : { color: colors.textSecondary }}
                    >
                      Oscuro
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Automático / Sistema */}
                  <TouchableOpacity
                    style={[
                      styles.themeOption,
                      themeMode === "system" && [styles.themeSelected, { borderColor: "#208AEF" }],
                      { backgroundColor: colors.background },
                    ]}
                    onPress={() => selectTheme("system")}
                  >
                    <Monitor size={20} color={themeMode === "system" ? "#208AEF" : colors.textSecondary} />
                    <ThemedText
                      type="small"
                      style={themeMode === "system" ? { color: "#208AEF", fontWeight: "bold" } : { color: colors.textSecondary }}
                    >
                      Sistema
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón Cerrar Sesión */}
              <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: "#ef4444" }]}
                onPress={logout}
              >
                <LogOut size={18} color="#ef4444" style={{ marginRight: Spacing.two }} />
                <ThemedText style={{ color: "#ef4444", fontWeight: "bold" }}>
                  Cerrar Sesión
                </ThemedText>
              </TouchableOpacity>
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
  sectionCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff15",
    marginVertical: Spacing.half,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  infoValue: {
    fontSize: 15,
    marginTop: 2,
  },
  themeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  themeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeSelected: {
    borderWidth: 1.5,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
});
