import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Redirigimos a la carpeta (tabs) en lugar de un archivo específico */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
