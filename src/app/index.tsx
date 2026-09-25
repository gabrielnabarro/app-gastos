import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../supabase";

// Reutilizamos la función de formato para la lista de gastos
const formatearMoneda = (valor) => {
  if (valor === undefined || valor === null) return "0,00";
  let partes = valor.toFixed(2).split(".");
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return partes.join(",");
};

export default function Home() {
  const router = useRouter();

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [gastos, setGastos] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // NUEVO: Estados para manejar la fecha
  const [fechaGasto, setFechaGasto] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchGastos();
  }, []);

  async function fetchCategorias() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
      if (data && data.length > 0) {
        setCategoriaSeleccionada(data[0].id);
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error.message);
    }
  }

  async function fetchGastos() {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      console.error("Error al cargar los gastos:", error.message);
    }
  }

  // Función que maneja el cambio en el calendario
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || fechaGasto;
    // En Android se cierra solo, en iOS lo cerramos manualmente
    setShowDatePicker(Platform.OS === "ios");
    // Si el usuario canceló, event.type es 'dismissed' (Android)
    if (event.type === "set" || Platform.OS === "ios") {
      setShowDatePicker(false);
      setFechaGasto(currentDate);
    } else {
      setShowDatePicker(false);
    }
  };

  async function guardarGasto() {
    if (!monto || !descripcion) {
      Alert.alert(
        "Faltan datos",
        "Por favor ingresá un monto y una descripción.",
      );
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("transactions").insert([
        {
          amount: parseFloat(monto.replace(",", ".")), // Por si escribís con coma
          description: descripcion,
          user_id: user.id,
          category_id: categoriaSeleccionada,
          // Insertamos la fecha elegida en formato YYYY-MM-DD
          date: fechaGasto.toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      // Limpiamos el formulario y volvemos la fecha a "hoy"
      setMonto("");
      setDescripcion("");
      setFechaGasto(new Date());
      fetchGastos();
    } catch (error) {
      Alert.alert("Error al guardar", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function eliminarGasto(id) {
    Alert.alert(
      "Eliminar Gasto",
      "¿Estás seguro de que querés borrar este gasto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("transactions")
                .delete()
                .eq("id", id);

              if (error) throw error;
              fetchGastos();
            } catch (error) {
              Alert.alert("Error al eliminar", error.message);
            }
          },
        },
      ],
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const fechaActual = new Date();
  const mesActualStr = String(fechaActual.getMonth() + 1).padStart(2, "0");
  const anioActualStr = String(fechaActual.getFullYear());
  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const nombreMes = nombresMeses[fechaActual.getMonth()];

  const gastosDelMes = gastos.filter((gasto) => {
    if (!gasto.date) return false;
    const anioGasto = gasto.date.substring(0, 4);
    const mesGasto = gasto.date.substring(5, 7);
    return anioGasto === anioActualStr && mesGasto === mesActualStr;
  });

  const totalGastado = gastosDelMes.reduce(
    (acumulador, gasto) => acumulador + gasto.amount,
    0,
  );

  const renderGasto = ({ item }) => (
    <View style={styles.gastoItem}>
      <View style={styles.gastoInfo}>
        <Text style={styles.gastoDescripcion}>{item.description}</Text>
        <View style={styles.metaRow}>
          {/* Mostramos la fecha en formato DD/MM/YYYY */}
          <Text style={styles.gastoFecha}>
            {item.date.substring(8, 10)}/{item.date.substring(5, 7)}/
            {item.date.substring(0, 4)}
          </Text>
          {item.categories?.name && (
            <View style={styles.categoriaTag}>
              <Text style={styles.categoriaTagText}>
                {item.categories.name}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.gastoAcciones}>
        <Text style={styles.gastoMonto}>${formatearMoneda(item.amount)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => eliminarGasto(item.id)}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel General</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total de {nombreMes}</Text>
        <Text style={styles.totalAmount}>${formatearMoneda(totalGastado)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nuevo Gasto</Text>

        <TextInput
          style={styles.input}
          placeholder="Monto (ej. 1500)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={monto}
          onChangeText={setMonto}
        />

        <TextInput
          style={styles.input}
          placeholder="Descripción (ej. Supermercado)"
          placeholderTextColor="#888"
          value={descripcion}
          onChangeText={setDescripcion}
        />

        {/* NUEVO: Selector de Fecha */}
        <View style={styles.rowPicker}>
          <Text style={styles.labelFila}>Fecha:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            {/* Mostramos la fecha amigable (ej: 25/09/2026) */}
            <Text style={styles.dateButtonText}>
              {fechaGasto.toLocaleDateString("es-AR")}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={fechaGasto}
            mode="date"
            display="default"
            onChange={onChangeDate}
            maximumDate={new Date()} // Evita que cargues gastos en el futuro
          />
        )}

        <Text style={styles.labelCategoria}>Categoría:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {categorias.map((cat) => {
            const isSelected = categoriaSeleccionada === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setCategoriaSeleccionada(cat.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Button
          title={loading ? "Guardando..." : "Guardar Gasto"}
          onPress={guardarGasto}
          disabled={loading}
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Historial de Movimientos</Text>
        <FlatList
          data={gastos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGasto}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay gastos registrados aún.</Text>
          }
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Cerrar Sesión" onPress={signOut} color="#ff3b30" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },

  totalCard: {
    backgroundColor: "#007bff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  totalLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
    textTransform: "capitalize",
  },
  totalAmount: { color: "white", fontSize: 36, fontWeight: "bold" },

  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },

  input: {
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    marginBottom: 12,
  },

  // Estilos del nuevo selector de fecha
  rowPicker: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  labelFila: { fontSize: 14, fontWeight: "600", color: "#555" },
  dateButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },

  labelCategoria: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  categoriesScroll: { flexDirection: "row", marginBottom: 15 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#ececec",
    marginRight: 8,
  },
  chipSelected: { backgroundColor: "#007bff" },
  chipText: { fontSize: 13, color: "#444", fontWeight: "500" },
  chipTextSelected: { color: "#fff", fontWeight: "bold" },

  listContainer: { flex: 1, marginBottom: 20 },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },

  gastoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  gastoInfo: { flex: 1 },
  gastoDescripcion: { fontSize: 16, fontWeight: "bold", color: "#333" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  gastoFecha: { fontSize: 12, color: "#888", marginRight: 8 },
  categoriaTag: {
    backgroundColor: "#eef4ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoriaTagText: { fontSize: 11, color: "#007bff", fontWeight: "600" },

  gastoAcciones: { flexDirection: "row", alignItems: "center" },
  gastoMonto: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff3b30",
    marginRight: 15,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: { color: "white", fontWeight: "bold", fontSize: 13 },

  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontStyle: "italic",
  },
  buttonContainer: { width: "100%", paddingBottom: 10 },
});
