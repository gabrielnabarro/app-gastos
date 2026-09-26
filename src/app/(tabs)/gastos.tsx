// src/app/(tabs)/gastos.tsx
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { supabase } from "../../../supabase";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category_id: string;
  payment_method_id: string | null; // Ahora es opcional
  categories: { name: string; icon: string };
}

const COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F43F5E",
];

export default function GastosScreen() {
  const [listaGastos, setListaGastos] = useState<Transaction[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados del formulario
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Eliminamos la consulta de métodos de pago para optimizar rendimiento
      const [transaccionesRes, categoriasRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, categories(name, icon)")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
        supabase.from("categories").select("*").eq("user_id", user.id),
      ]);

      if (transaccionesRes.error) throw transaccionesRes.error;
      if (categoriasRes.error) throw categoriasRes.error;

      setListaGastos(transaccionesRes.data || []);
      setCategorias(categoriasRes.data || []);

      if (categoriasRes.data && categoriasRes.data.length > 0) {
        setSelectedCategoryId(categoriasRes.data[0].id);
      }
    } catch (error: any) {
      Alert.alert("Error cargando datos", error.message);
    } finally {
      setLoading(false);
    }
  };

  const agregarGasto = async () => {
    if (!description || !amount || !selectedCategoryId) {
      Alert.alert(
        "Datos incompletos",
        "Por favor completa la descripción, monto y categoría.",
      );
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fechaActual = new Date().toISOString().split("T")[0];

      const nuevaTransaccion = {
        user_id: user.id,
        description,
        amount: parseFloat(amount),
        date: fechaActual,
        category_id: selectedCategoryId,
        payment_method_id: null, // Enviamos nulo explícitamente para uso futuro
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert([nuevaTransaccion])
        .select("*, categories(name, icon)")
        .single();

      if (error) throw error;

      setListaGastos([data, ...listaGastos]);
      setDescription("");
      setAmount("");
      setModalVisible(false);
      Keyboard.dismiss();
    } catch (error: any) {
      Alert.alert("Error al guardar", error.message);
    }
  };

  const gastosAgrupados = listaGastos.reduce(
    (acc, curr) => {
      const catName = curr.categories?.name || "Sin Categoría";
      acc[catName] = (acc[catName] || 0) + Number(curr.amount);
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData =
    Object.keys(gastosAgrupados).length > 0
      ? Object.keys(gastosAgrupados).map((catName, index) => ({
          value: gastosAgrupados[catName],
          color: COLORS[index % COLORS.length],
          focused: index === 0,
        }))
      : [{ value: 1, color: "#334155" }];

  const totalMes = listaGastos.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const catName = item.categories?.name || "Desconocido";
    const catKeys = Object.keys(gastosAgrupados);
    const colorIndex = catKeys.indexOf(catName);
    const cardColor =
      colorIndex !== -1 ? COLORS[colorIndex % COLORS.length] : "#EC4899";
    const fechaFormat = new Date(item.date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View
            style={[styles.colorIndicator, { backgroundColor: cardColor }]}
          />
          <View>
            <Text style={styles.cardTitle}>{item.description}</Text>
            <Text style={styles.cardSubtitle}>
              {item.categories?.icon ? `${item.categories.icon} ` : ""}
              {catName} • {fechaFormat}
            </Text>
          </View>
        </View>
        <Text style={styles.cardAmount}>
          ${Number(item.amount).toLocaleString("es-AR")}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerAll]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listaGastos}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Resumen del Mes</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                donut
                showGradient
                sectionAutoFocus
                radius={90}
                innerRadius={60}
                innerCircleColor={"#1E293B"}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelValue}>
                      ${totalMes.toLocaleString("es-AR")}
                    </Text>
                    <Text style={styles.centerLabelText}>Total</Text>
                  </View>
                )}
              />
            </View>
            <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay transacciones registradas.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (categorias.length === 0) {
            Alert.alert(
              "Atención",
              "Debes crear categorías en tu base de datos primero.",
            );
            return;
          }
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoiding}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Nuevo Gasto</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Descripción (ej. Supermercado)"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Monto (ej. 15000)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />

                <Text style={styles.labelCategoria}>Categoría:</Text>
                <View style={styles.categoriasContainer}>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        selectedCategoryId === cat.id && styles.chipActive,
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        Keyboard.dismiss();
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedCategoryId === cat.id &&
                            styles.chipTextActive,
                        ]}
                      >
                        {cat.icon ? `${cat.icon} ` : ""}
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnCancel]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.btnTextCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSave]}
                    onPress={agregarGasto}
                  >
                    <Text style={styles.btnTextSave}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerAll: { justifyContent: "center", alignItems: "center" },
  listPadding: { padding: 20, paddingBottom: 40 },
  headerContainer: { marginBottom: 20 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 20,
  },
  chartContainer: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  centerLabel: { justifyContent: "center", alignItems: "center" },
  centerLabelValue: { fontSize: 22, fontWeight: "bold", color: "#F8FAFC" },
  centerLabelText: { fontSize: 14, color: "#94A3B8" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardLeft: { flexDirection: "row", alignItems: "center" },
  colorIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 16 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#94A3B8" },
  cardAmount: { fontSize: 16, fontWeight: "bold", color: "#EF4444" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: { fontSize: 32, color: "#FFF", lineHeight: 36 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  keyboardAvoiding: { width: "100%", alignItems: "center" },
  modalContent: {
    backgroundColor: "#1E293B",
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  labelCategoria: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 4,
  },
  categoriasContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: "#0F172A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  chipText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  chipTextActive: { color: "#FFF", fontWeight: "bold" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: "#334155" },
  btnSave: { backgroundColor: "#3B82F6" },
  btnTextCancel: { color: "#F8FAFC", fontWeight: "600" },
  btnTextSave: { color: "#FFF", fontWeight: "bold" },
});
