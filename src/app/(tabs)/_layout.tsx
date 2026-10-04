// src/app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B82F6", // Color azul estilo Tailwind para la pestaña activa
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
          paddingBottom: 5,
        },
      }}
    >
      {/* Pestaña 1: Gastos */}
      <Tabs.Screen
        name="gastos"
        options={{
          title: "Gastos",
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet-outline" size={24} color={color} />
          ),
        }}
      />

      {/* Pestaña 2: Reportes (Esta es la que te desapareció) */}
      <Tabs.Screen
        name="reportes"
        options={{
          title: "Reportes",
          tabBarIcon: ({ color }) => (
            <Ionicons name="pie-chart-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
