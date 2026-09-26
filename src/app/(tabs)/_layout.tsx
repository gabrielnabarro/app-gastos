import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007bff",
        tabBarStyle: { paddingBottom: 5, height: 60 },
      }}
    >
      {/* Cambiamos name="index" por name="gastos" */}
      <Tabs.Screen name="gastos" options={{ title: "Gastos" }} />
      <Tabs.Screen name="reportes" options={{ title: "Reportes" }} />
    </Tabs>
  );
}
