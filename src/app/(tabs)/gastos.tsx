// src/app/(tabs)/gastos.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../supabase";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import ModalDetalleGasto from "../../components/ModalDetalleGasto";
import ModalNuevoGasto from "../../components/ModalNuevoGasto";

// 1. IMPORTAMOS NUESTRO CUSTOM HOOK Y SUS INTERFACES
import { Category, useVoiceExpense } from "../../hooks/useVoiceExpense";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
  category_id: string;
  payment_method_id: string | null;
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
const NOMBRES_DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const NOMBRES_MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function GastosScreen() {
  const [listaGastos, setListaGastos] = useState<Transaction[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalNuevoVisible, setModalNuevoVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);

  const [gastoAEliminar, setGastoAEliminar] = useState<string | null>(null);
  const [gastoSeleccionado, setGastoSeleccionado] =
    useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 2. INICIALIZAMOS LA LÓGICA DE AUDIO E IA INYECTANDO LAS CATEGORÍAS
  const {
    isRecordingUI,
    isProcessingVoice,
    startRecording,
    stopRecordingAndProcess,
  } = useVoiceExpense(categorias);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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

  // 3. FUNCIÓN PUENTE: Maneja el resultado del Hook y actualiza la UI
  const handleStopRecording = async () => {
    const result = await stopRecordingAndProcess();

    // Si Gemini devuelve datos válidos, rellenamos el formulario y abrimos el modal
    if (result) {
      setDescription(result.description);
      setAmount(result.amount);
      setDate(result.date);
      if (result.categoryId) setSelectedCategoryId(result.categoryId);

      setModalNuevoVisible(true);
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

      const fechaDB = toLocalISODate(date);

      const nuevaTransaccion = {
        user_id: user.id,
        description,
        amount: parseFloat(amount),
        date: fechaDB,
        category_id: selectedCategoryId,
        payment_method_id: null,
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert([nuevaTransaccion])
        .select("*, categories(name, icon)")
        .single();

      if (error) throw error;

      const nuevaLista = [data, ...listaGastos].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setListaGastos(nuevaLista);
      setDescription("");
      setAmount("");
      setDate(new Date());
      setModalNuevoVisible(false);
      Keyboard.dismiss();
    } catch (error: any) {
      Alert.alert("Error al guardar", error.message);
    }
  };

  const confirmarEliminacion = (id: string) => {
    setGastoAEliminar(id);
    setModalEliminarVisible(true);
  };

  const ejecutarEliminacion = async () => {
    if (!gastoAEliminar) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", gastoAEliminar);
      if (error) throw error;

      setListaGastos((prev) =>
        prev.filter((gasto) => gasto.id !== gastoAEliminar),
      );
    } catch (error: any) {
      Alert.alert("Error al eliminar", error.message);
    } finally {
      setModalEliminarVisible(false);
      setGastoAEliminar(null);
    }
  };

  const obtenerColorCategoria = (catName: string) => {
    const index = categorias.findIndex((c) => c.name === catName);
    return index !== -1 ? COLORS[index % COLORS.length] : "#334155";
  };

  const abrirDetalleGasto = (gasto: Transaction) => {
    setGastoSeleccionado(gasto);
    setModalDetalleVisible(true);
  };

  const gastosFiltrados = listaGastos.filter((gasto) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchDesc = gasto.description.toLowerCase().includes(query);
    const matchCat = (gasto.categories?.name || "")
      .toLowerCase()
      .includes(query);
    const fechaSplit = gasto.date.split("-");
    const fechaLocal = new Date(
      Number(fechaSplit[0]),
      Number(fechaSplit[1]) - 1,
      Number(fechaSplit[2]),
    );
    const fechaFormat = `${String(fechaLocal.getDate()).padStart(2, "0")}/${String(fechaLocal.getMonth() + 1).padStart(2, "0")}`;
    return (
      matchDesc ||
      matchCat ||
      fechaFormat.includes(query) ||
      gasto.date.includes(query)
    );
  });

  const gastosAgrupados = gastosFiltrados.reduce(
    (acc, curr) => {
      const catName = curr.categories?.name || "Sin Categoría";
      acc[catName] = (acc[catName] || 0) + Number(curr.amount);
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData =
    Object.keys(gastosAgrupados).length > 0
      ? Object.keys(gastosAgrupados).map((catName) => ({
          value: gastosAgrupados[catName],
          color: obtenerColorCategoria(catName),
        }))
      : [{ value: 1, color: "#334155" }];

  const totalFiltrado = gastosFiltrados.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const catName = item.categories?.name || "Desconocido";
    const cardColor = obtenerColorCategoria(catName);

    const fechaSplit = item.date.split("-");
    const fechaLocal = new Date(
      Number(fechaSplit[0]),
      Number(fechaSplit[1]) - 1,
      Number(fechaSplit[2]),
    );
    const nombreDia = NOMBRES_DIAS[fechaLocal.getDay()];
    const diaNum = String(fechaLocal.getDate()).padStart(2, "0");
    const mesNombre = NOMBRES_MESES[fechaLocal.getMonth()];
    const anio = fechaLocal.getFullYear();
    const fechaFormat = `${nombreDia} ${diaNum}-${mesNombre} ${anio}`;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirDetalleGasto(item)}
      >
        <View style={styles.cardLeft}>
          <View
            style={[styles.colorIndicator, { backgroundColor: cardColor }]}
          />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={styles.cardSubtitle}>
              {item.categories?.icon ? `${item.categories.icon} ` : ""}
              {catName} • {fechaFormat}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>
            ${Number(item.amount).toLocaleString("es-AR")}
          </Text>
          <TouchableOpacity
            onPress={() => confirmarEliminacion(item.id)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
        data={gastosFiltrados}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Resumen General</Text>
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
                      ${totalFiltrado.toLocaleString("es-AR")}
                    </Text>
                    <Text style={styles.centerLabelText}>Total</Text>
                  </View>
                )}
              />
              {Object.keys(gastosAgrupados).length > 0 && (
                <View style={styles.leyendaContainer}>
                  {Object.keys(gastosAgrupados).map((catName) => (
                    <View key={catName} style={styles.leyendaItem}>
                      <View
                        style={[
                          styles.colorIndicatorSmall,
                          { backgroundColor: obtenerColorCategoria(catName) },
                        ]}
                      />
                      <Text style={styles.leyendaText}>{catName}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Text style={styles.sectionTitle}>
              {searchQuery
                ? "Resultados de la búsqueda"
                : "Transacciones Recientes"}
            </Text>
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No se encontraron transacciones.</Text>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fabVoice, isRecordingUI && styles.fabRecording]}
          onPressIn={startRecording}
          onPressOut={handleStopRecording}
          disabled={isProcessingVoice}
          activeOpacity={0.8}
        >
          {isProcessingVoice ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Ionicons name="mic" size={28} color="#FFF" />
          )}
        </TouchableOpacity>

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
            setModalNuevoVisible(true);
          }}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <ModalNuevoGasto
        visible={modalNuevoVisible}
        onClose={() => {
          setModalNuevoVisible(false);
          setDescription("");
          setAmount("");
          setDate(new Date());
        }}
        onSave={agregarGasto}
        description={description}
        setDescription={setDescription}
        amount={amount}
        setAmount={setAmount}
        date={date}
        setDate={setDate}
        categorias={categorias}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
      />

      <ModalDetalleGasto
        visible={modalDetalleVisible}
        onClose={() => setModalDetalleVisible(false)}
        gasto={gastoSeleccionado}
      />

      <ModalConfirmarEliminacion
        visible={modalEliminarVisible}
        onClose={() => setModalEliminarVisible(false)}
        onConfirm={ejecutarEliminacion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerAll: { justifyContent: "center", alignItems: "center" },
  listPadding: { padding: 20, paddingBottom: 100 },
  headerContainer: { marginBottom: 10 },
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
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  centerLabel: { justifyContent: "center", alignItems: "center" },
  centerLabelValue: { fontSize: 22, fontWeight: "bold", color: "#F8FAFC" },
  centerLabelText: { fontSize: 14, color: "#94A3B8" },
  leyendaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    gap: 12,
  },
  leyendaItem: { flexDirection: "row", alignItems: "center" },
  colorIndicatorSmall: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  leyendaText: { color: "#94A3B8", fontSize: 13 },
  searchInput: {
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    fontSize: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
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
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTextContainer: { flex: 1, paddingRight: 8 },
  colorIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 16 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#94A3B8", textTransform: "capitalize" },
  cardRight: { flexDirection: "row", alignItems: "center" },
  cardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
    marginRight: 12,
  },
  deleteBtn: {
    backgroundColor: "#EF444420",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    gap: 16,
    alignItems: "center",
  },
  fab: {
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
  fabVoice: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabRecording: { backgroundColor: "#EF4444", transform: [{ scale: 1.1 }] },
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
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  datePickerBtn: {
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  datePickerText: { color: "#F8FAFC", fontSize: 16, fontWeight: "500" },
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
  detailBox: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  detailLabel: { fontSize: 14, color: "#94A3B8", fontWeight: "500" },
  detailValue: {
    fontSize: 15,
    color: "#F8FAFC",
    fontWeight: "600",
    maxWidth: "65%",
    textAlign: "right",
  },
  btnCerrar: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnCerrarText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
