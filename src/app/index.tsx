import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../supabase";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Revisamos si ya hay sesión al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTimeout(() => router.replace("/home"), 100);
      }
    });

    // Escuchamos si el usuario acaba de iniciar sesión
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setTimeout(() => router.replace("/home"), 100);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert("Atención", "Por favor completá todos los campos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) Alert.alert("Error al iniciar sesión", error.message);
    } catch (e) {
      Alert.alert("Error inesperado", "Ocurrió un problema de conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert("Atención", "Por favor completá todos los campos");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });
      if (error) {
        Alert.alert("Error al registrarse", error.message);
      } else {
        Alert.alert("¡Éxito!", "Usuario registrado. Ya podés iniciar sesión.");
      }
    } catch (e) {
      Alert.alert("Error inesperado", "Ocurrió un problema de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi App de Gastos</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setEmail}
          value={email}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Contraseña"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Iniciar Sesión"
          disabled={loading}
          onPress={signInWithEmail}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Registrarme"
          disabled={loading}
          onPress={signUpWithEmail}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
    color: "#333",
  },
  inputContainer: { marginBottom: 15 },
  input: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  buttonContainer: { marginTop: 10, width: "100%" },
});
