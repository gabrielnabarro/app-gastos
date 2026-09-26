import { Session } from "@supabase/supabase-js";
import { Redirect, Stack, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Mientras carga la sesión inicial, mostramos un spinner
  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // ¿En qué pantalla estamos?
  const inAuthGroup = segments[0] === "login";

  // 1. Si NO hay sesión y NO estamos en el login -> Mandar al login
  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  // 2. Si HAY sesión y estamos en el login -> Mandar a las tabs (a la pantalla de gastos)
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)/gastos" />;
  }

  // Si estamos en la pantalla correcta, mostramos el Stack normal
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
