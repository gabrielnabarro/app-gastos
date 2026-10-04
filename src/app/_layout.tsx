// src/app/_layout.tsx
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. Efecto para suscribirse a los cambios de autenticación
  useEffect(() => {
    // Obtenemos la sesión actual al arrancar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // Escuchamos activamente si el usuario hace login o logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Limpiamos la suscripción si el componente se desmonta
    return () => subscription.unsubscribe();
  }, []);

  // 2. Efecto Guardia: Redirige basándose en la sesión y la ruta actual
  useEffect(() => {
    // No hacemos nada hasta que Supabase nos confirme si hay sesión o no
    if (!isInitialized) return;

    // Evaluamos si el usuario está intentando acceder a una ruta dentro de (tabs)
    const inAuthGroup = segments[0] === "(tabs)";

    if (!session && inAuthGroup) {
      // ⛔ USUARIO SIN SESIÓN -> Intenta ir a zona privada -> Lo enviamos al Login
      router.replace("/login");
    } else if (session && !inAuthGroup) {
      // ✅ USUARIO AUTENTICADO -> Está en login o index -> Lo enviamos a sus Gastos
      router.replace("/(tabs)/gastos");
    }
  }, [session, isInitialized, segments]);

  // Si no está inicializado, no renderizamos nada (evita pantallazos de rutas incorrectas)
  if (!isInitialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
