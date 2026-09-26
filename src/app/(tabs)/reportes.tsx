// src/app/(tabs)/reportes.tsx
import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { supabase } from "../../../supabase"; // Conexión a la instancia de la raíz

const barData = [
  { value: 45000, label: "Sem 1", frontColor: "#10B981" },
  { value: 30000, label: "Sem 2", frontColor: "#3B82F6" },
  { value: 15000, label: "Sem 3", frontColor: "#F59E0B" },
  { value: 8000, label: "Sem 4", frontColor: "#8B5CF6" },
];

export default function ReportesScreen() {
  // Función para cerrar la sesión en Supabase y redirigir a la pantalla de acceso
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollPadding}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Análisis Mensual</Text>
          <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evolución de Gastos</Text>
          <View style={styles.chartWrapper}>
            <BarChart
              data={barData}
              barWidth={32}
              spacing={24}
              roundedTop
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: "#94A3B8" }}
              noOfSections={3}
              maxValue={50000}
              isAnimated
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Promedio Diario</Text>
            <Text style={styles.statValue}>$3.266</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gasto Mayor</Text>
            <Text style={styles.statValue}>Comida</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  scrollPadding: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#F8FAFC" },
  logoutBtn: {
    backgroundColor: "#EF444420",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutText: { color: "#EF4444", fontWeight: "bold", fontSize: 14 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 24,
  },
  chartWrapper: { alignItems: "center" },
  statsRow: { flexDirection: "row", gap: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
  },
  statLabel: { fontSize: 13, color: "#94A3B8", marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#F8FAFC" },
});
