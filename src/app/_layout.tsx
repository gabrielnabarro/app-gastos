// src/app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      {/* Forzamos la barra de estado en modo claro para que contraste con el fondo oscuro */}
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          // Inyectamos el color de fondo moderno (#0F172A) directamente al contenedor principal
          contentStyle: { backgroundColor: "#0F172A" },
          // Si en el futuro activas headers, heredarán este color
          headerStyle: { backgroundColor: "#1E293B" },
          headerTintColor: "#F8FAFC",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Aquí puedes agregar login u otras rutas en el futuro */}
      </Stack>
    </>
  );
}
