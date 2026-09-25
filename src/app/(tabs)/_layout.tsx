import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ocultamos el título superior por defecto
        tabBarActiveTintColor: "#007bff", // Color cuando la pestaña está activa
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gastos",
          // Opcional: Acá iría un ícono si tuviéramos una librería de íconos instalada
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: "Reportes",
        }}
      />
    </Tabs>
  );
}
