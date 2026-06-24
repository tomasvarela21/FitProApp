import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const { user } = useAuth();

  if (!user) return null;

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {user.role === "TRAINER" ? (
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Alumnos</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require("@/assets/images/tabIcons/home.png")}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Mi Rutina</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require("@/assets/images/tabIcons/home.png")}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {user.role === "TRAINER" ? (
        <NativeTabs.Trigger name="alerts">
          <NativeTabs.Trigger.Label>Alertas</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require("@/assets/images/tabIcons/explore.png")}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="fees">
          <NativeTabs.Trigger.Label>Mis Cuotas</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require("@/assets/images/tabIcons/explore.png")}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
