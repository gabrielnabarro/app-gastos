// src/app/(tabs)/gastos.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../supabase";

// SOLUCIÓN: Importamos el Namespace completo de la ÚNICA librería oficial.
// Esto evita cualquier colapso por "undefined".
import * as ExpoAudio from "expo-audio";

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

// apikey
const GEMINI_API_KEY = "";

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

  // CONFIGURACIÓN DE AUDIO (WAV 16kHz)
  const audioRecorder = ExpoAudio.useAudioRecorder({
    extension: ".wav",
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  });

  const isPressing = useRef<boolean>(false);
  const pressStartTime = useRef<number>(0);
  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
    if (Platform.OS === "android") {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ).catch(console.warn);
    }
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

  // =====================================================================
  // LÓGICA DE GRABACIÓN BLINDADA MEDIANTE NAMESPACE (iOS + Android)
  // =====================================================================

  const setAudioSessionForIOS = async (active: boolean) => {
    if (Platform.OS !== "ios") return;
    try {
      // Usamos el objeto global ExpoAudio para prevenir crashes de "undefined"
      if (typeof (ExpoAudio as any).setAudioModeAsync === "function") {
        await (ExpoAudio as any).setAudioModeAsync({
          allowsRecordingIOS: active,
          playsInSilentModeIOS: true,
        });
      }
    } catch (e) {
      console.warn("No se pudo configurar la sesión de audio:", e);
    }
  };

  const startRecording = async () => {
    try {
      if (categorias.length === 0) {
        Alert.alert(
          "Atención",
          "Debes crear categorías antes de agregar gastos.",
        );
        return;
      }

      isPressing.current = true;
      let hasPermission = false;

      // 1. Verificación de Permisos Dinámica
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        if (typeof (ExpoAudio as any).requestPermissionsAsync === "function") {
          const status = await (ExpoAudio as any).requestPermissionsAsync();
          hasPermission = status?.granted || status?.status === "granted";
        } else {
          // Si Expo ocultó la función, permitimos que el sistema iOS muestre el cartel automáticamente al grabar
          hasPermission = true;
        }
      }

      if (!hasPermission) {
        Alert.alert(
          "Permiso denegado",
          "Ve a la Configuración de tu celular y activa el Micrófono.",
        );
        isPressing.current = false;
        return;
      }

      if (!isPressing.current) return;

      // 2. EL CANDADO DE APPLE: Configuramos la sesión de forma segura
      await setAudioSessionForIOS(true);

      // 3. Encendemos el hardware
      pressStartTime.current = Date.now();
      audioRecorder.record();

      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!audioRecorder.isRecording) {
        throw new Error("El sistema operativo bloqueó el micrófono.");
      }

      setIsRecordingUI(true);
    } catch (err: any) {
      console.error("Error al iniciar grabación:", err);
      Alert.alert(
        "Fallo de Hardware",
        err.message || "No se pudo encender el micrófono.",
      );
      isPressing.current = false;
      setIsRecordingUI(false);
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!isRecordingUI) return;

    // VALIDACIÓN ANTI-TAP (< 1.5s)
    const pressDuration = Date.now() - pressStartTime.current;
    if (pressDuration < 1500) {
      setIsRecordingUI(false);
      audioRecorder.stop();
      await setAudioSessionForIOS(false);
      Alert.alert(
        "Audio muy corto",
        "Mantén presionado el botón por más de 1.5 segundos para dictar tu gasto.",
      );
      return;
    }

    try {
      setIsRecordingUI(false);
      setIsProcessingVoice(true);

      // 1. Apagamos el micrófono
      audioRecorder.stop();

      // 2. DEVOLVEMOS EL CANDADO A APPLE
      await setAudioSessionForIOS(false);

      // 3. Retraso seguro de escritura en disco
      await new Promise((resolve) => setTimeout(resolve, 500));

      const uri = audioRecorder.uri;

      if (!uri)
        throw new Error("Fallo crítico: El sistema no guardó el archivo WAV.");

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fechaHoy = new Date().toISOString().split("T")[0];
      const nombresCategorias = categorias.map((c) => c.name).join(", ");

      const prompt = `
        Eres un asistente financiero experto.
        Escucha el audio adjunto y extrae los datos del gasto. 
        Hoy es ${fechaHoy}. Si el usuario dice "ayer", calcula la fecha correcta.
        Las categorías válidas en la base de datos son: ${nombresCategorias}. 
        
        Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin texto adicional ni formato Markdown:
        {
          "description": "nombre descriptivo y corto",
          "amount": numero_entero_sin_simbolos,
          "date": "YYYY-MM-DD",
          "category": "nombre de la categoria más parecida de la lista proporcionada"
        }
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "audio/wav", data: base64Audio } },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      let jsonText = data.candidates[0].content.parts[0].text;
      jsonText = jsonText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const gastoIA = JSON.parse(jsonText);

      const categoriaEncontrada = categorias.find(
        (c) => c.name.toLowerCase() === gastoIA.category.toLowerCase(),
      );

      setDescription(gastoIA.description);
      setAmount(gastoIA.amount.toString());
      if (gastoIA.date) setDate(new Date(gastoIA.date + "T00:00:00"));
      if (categoriaEncontrada) setSelectedCategoryId(categoriaEncontrada.id);

      setModalNuevoVisible(true);
    } catch (err: any) {
      console.error("Error procesando voz", err);
      Alert.alert(
        "No se pudo procesar",
        err.message ||
          "Asegúrate de hablar claro e indicar monto y descripción.",
      );
    } finally {
      setIsProcessingVoice(false);
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

      const fechaDB = date.toISOString().split("T")[0];

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
    const matchDate = fechaFormat.includes(query) || gasto.date.includes(query);
    return matchDesc || matchCat || matchDate;
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
          onPressOut={stopRecordingAndProcess}
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

      <Modal visible={modalNuevoVisible} animationType="slide" transparent>
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

                <Text style={styles.labelCategoria}>Fecha del Gasto:</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {date.toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (event.type === "set" && selectedDate) {
                        setDate(selectedDate);
                        if (Platform.OS === "android") setShowDatePicker(false);
                      } else {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                )}

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
                    onPress={() => {
                      setModalNuevoVisible(false);
                      setDescription("");
                      setAmount("");
                      setDate(new Date());
                    }}
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

      <Modal visible={modalDetalleVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalDetalleVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {gastoSeleccionado && (
                <>
                  <Text style={styles.modalTitle}>Detalle de Transacción</Text>
                  <View style={styles.detailBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Descripción:</Text>
                      <Text style={styles.detailValue}>
                        {gastoSeleccionado.description}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Monto:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          { color: "#EF4444", fontWeight: "bold" },
                        ]}
                      >
                        $
                        {Number(gastoSeleccionado.amount).toLocaleString(
                          "es-AR",
                        )}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fecha:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(
                          gastoSeleccionado.date + "T00:00:00",
                        ).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Horario:</Text>
                      <Text style={styles.detailValue}>
                        {gastoSeleccionado.created_at
                          ? new Date(
                              gastoSeleccionado.created_at,
                            ).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No disponible"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Categoría:</Text>
                      <Text style={styles.detailValue}>
                        {gastoSeleccionado.categories?.icon
                          ? `${gastoSeleccionado.categories.icon} `
                          : ""}
                        {gastoSeleccionado.categories?.name || "Desconocido"}
                      </Text>
                    </View>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={styles.btnCerrar}
                onPress={() => setModalDetalleVisible(false)}
              >
                <Text style={styles.btnCerrarText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalEliminarVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalEliminarVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Eliminar Gasto</Text>
              <Text style={styles.modalText}>
                ¿Estás seguro de que deseas eliminar este gasto? Esta acción no
                se puede deshacer.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setModalEliminarVisible(false)}
                >
                  <Text style={styles.btnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#EF4444" }]}
                  onPress={ejecutarEliminacion}
                >
                  <Text style={styles.btnTextSave}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
