import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // NUEVO: Escuchamos los cambios de estado directamente desde Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // Si hay una sesión confirmada, entramos a la app
          router.replace("/(tabs)");
        } else {
          // Si la sesión se cierra o no existe, mostramos el formulario
          setCargandoSesion(false);
        }
      },
    );

    // Limpiamos el listener cuando el componente se desmonta
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
    }
    router.replace("/(tabs)/gastos");
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Revisá tu email",
        "Te mandamos un link para confirmar tu cuenta.",
      );
    }
    setLoading(false);
  }

  if (cargandoSesion) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi App de Gastos</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? "Cargando..." : "Iniciar Sesión"}
          onPress={handleLogin}
          disabled={loading}
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? "Cargando..." : "Crear Cuenta"}
          onPress={handleSignUp}
          disabled={loading}
          color="#34c759"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  buttonContainer: { marginBottom: 10 },
});
