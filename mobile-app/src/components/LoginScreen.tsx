import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Dumbbell, Settings, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing } from "@/constants/theme";

export const LoginScreen = () => {
  const { login, apiUrl, setApiUrl } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newApiUrl, setNewApiUrl] = useState(apiUrl);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message ?? "Credenciales incorrectas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    await setApiUrl(newApiUrl.trim());
    setShowSettings(false);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {showSettings ? (
            <View style={styles.settingsPanel}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.two }}>
                Configuración del Servidor
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                value={newApiUrl}
                onChangeText={setNewApiUrl}
                placeholder="http://10.0.2.2:4000/api"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
              <View style={styles.settingsActions}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.backgroundSelected }]}
                  onPress={() => setShowSettings(false)}
                >
                  <ThemedText style={{ color: colors.text }}>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleSaveSettings}
                >
                  <ThemedText style={{ color: "#ffffff", fontWeight: "bold" }}>
                    Guardar
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.loginCard}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Dumbbell size={32} color="#ffffff" />
                </View>
                <ThemedText type="title" style={styles.logoText}>
                  FitPro
                </ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  Tu panel de entrenamiento móvil
                </ThemedText>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Email
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.backgroundElement,
                        borderColor: colors.backgroundSelected,
                      },
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ejemplo@email.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Contraseña
                  </ThemedText>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.backgroundElement,
                          borderColor: colors.backgroundSelected,
                        },
                      ]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {error && (
                  <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, styles.loginButton]}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.loginButtonText}>Ingresar</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  settingsButton: {
    alignSelf: "flex-end",
    padding: Spacing.two,
  },
  settingsPanel: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  settingsActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  loginCard: {
    gap: Spacing.five,
  },
  logoContainer: {
    alignItems: "center",
    gap: Spacing.one,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: Spacing.three,
    backgroundColor: "#208AEF", // FitPro primary color
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontWeight: "bold",
  },
  form: {
    gap: Spacing.three,
  },
  inputContainer: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    height: "100%",
    justifyContent: "center",
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
  },
  primaryButton: {
    backgroundColor: "#208AEF",
  },
  loginButton: {
    height: 48,
    borderRadius: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.two,
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderColor: "rgba(220, 38, 38, 0.2)",
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
  },
});
