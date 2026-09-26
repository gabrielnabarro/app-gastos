// src/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Oculta el header superior
        tabBarStyle: {
          backgroundColor: "#1E293B", // Mismo color de las tarjetas
          borderTopColor: "#334155", // Borde sutil
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#3B82F6", // Azul brillante cuando está seleccionado
        tabBarInactiveTintColor: "#94A3B8", // Gris cuando no está seleccionado
      }}
    >
      <Tabs.Screen name="gastos" options={{ title: "Gastos" }} />
      <Tabs.Screen name="reportes" options={{ title: "Reportes" }} />
    </Tabs>
  );
}
