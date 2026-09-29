// src/app/(tabs)/reportes.tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { supabase } from "../../../supabase";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string; // <-- Agregamos este campo para extraer el horario
  categories: { name: string; icon: string };
}

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export default function ReportesScreen() {
  const [listaGastos, setListaGastos] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");

  // Estado unificado para nuestro Modal personalizado
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    tipo: "info" | "detalle";
    titulo?: string;
    mensaje?: string;
    gasto?: Transaction;
  }>({ visible: false, tipo: "info" });

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fechaSeisMeses = new Date();
      fechaSeisMeses.setMonth(fechaSeisMeses.getMonth() - 5);
      fechaSeisMeses.setDate(1);
      const fechaLimite = fechaSeisMeses.toISOString().split("T")[0];

      // El select('*') ya nos trae el created_at por defecto
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name, icon)")
        .eq("user_id", user.id)
        .gte("date", fechaLimite)
        .order("date", { ascending: false });

      if (error) throw error;
      setListaGastos(data || []);

      const hoy = new Date();
      const mesActualKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
      setMesSeleccionado(mesActualKey);
    } catch (error: any) {
      console.log("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const agruparPorMes = () => {
    const agrupado: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      agrupado[key] = 0;
    }
    listaGastos.forEach((gasto) => {
      const mesKey = gasto.date.substring(0, 7);
      if (agrupado[mesKey] !== undefined) {
        agrupado[mesKey] += Number(gasto.amount);
      }
    });
    return agrupado;
  };

  const agrupadoData = agruparPorMes();

  const barData = Object.keys(agrupadoData).map((mesKey) => {
    const [year, month] = mesKey.split("-");
    const label = `${MESES[parseInt(month) - 1]}`;
    const isSelected = mesSeleccionado === mesKey;

    return {
      value: agrupadoData[mesKey],
      label: label,
      frontColor: isSelected ? "#3B82F6" : "#334155",
      onPress: () => setMesSeleccionado(mesKey),
    };
  });

  const gastosDelMesSeleccionado = listaGastos.filter((gasto) =>
    gasto.date.startsWith(mesSeleccionado),
  );

  const totalMes = gastosDelMesSeleccionado.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );
  const promedio =
    gastosDelMesSeleccionado.length > 0
      ? totalMes / gastosDelMesSeleccionado.length
      : 0;

  // Funciones para abrir nuestro Modal oscuro en lugar del Alert nativo
  const abrirInfoTotal = () => {
    setModalConfig({
      visible: true,
      tipo: "info",
      titulo: "Total del Mes",
      mensaje:
        "Representa la suma absoluta de todos los gastos que has registrado en el mes actualmente seleccionado en el gráfico.",
    });
  };

  const abrirInfoPromedio = () => {
    setModalConfig({
      visible: true,
      tipo: "info",
      titulo: "Promedio x Gasto",
      mensaje:
        'Se calcula dividiendo el "Total del Mes" entre la cantidad de transacciones. Te ayuda a entender cuánto dinero gastas en promedio cada vez que realizas un pago.',
    });
  };

  const abrirDetalleGasto = (gasto: Transaction) => {
    setModalConfig({
      visible: true,
      tipo: "detalle",
      gasto: gasto,
    });
  };

  const renderGastoDetalle = ({ item }: { item: Transaction }) => {
    const catName = item.categories?.name || "Desconocido";
    const fechaSplit = item.date.split("-");
    const fechaLocal = new Date(
      Number(fechaSplit[0]),
      Number(fechaSplit[1]) - 1,
      Number(fechaSplit[2]),
    );
    const fechaFormat = fechaLocal.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirDetalleGasto(item)}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>{item.categories?.icon || "📝"}</Text>
          <View>
            <Text style={styles.cardTitle}>{item.description}</Text>
            <Text style={styles.cardSubtitle}>
              {catName} • {fechaFormat}
            </Text>
          </View>
        </View>
        <Text style={styles.cardAmount}>
          ${Number(item.amount).toLocaleString("es-AR")}
        </Text>
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
        data={gastosDelMesSeleccionado}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Reportes</Text>
              <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Salir</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Últimos 6 Meses</Text>
              <Text style={styles.chartSubtitle}>
                Toca una barra para ver detalles
              </Text>
              <View style={styles.chartWrapper}>
                <BarChart
                  data={barData}
                  barWidth={24}
                  spacing={22}
                  roundedTop
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  // Aquí aplicamos el color gris (#94A3B8) a los textos de los meses
                  xAxisLabelTextStyle={{ color: "#94A3B8", fontSize: 11 }}
                  yAxisTextStyle={{ color: "#94A3B8", fontSize: 10 }}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statCard}
                onPress={abrirInfoTotal}
              >
                <View style={styles.statLabelRow}>
                  <Text style={styles.statLabel}>Total del Mes</Text>
                  <Text style={styles.infoIcon}>ⓘ</Text>
                </View>
                <Text style={styles.statValue}>
                  ${totalMes.toLocaleString("es-AR")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCard}
                onPress={abrirInfoPromedio}
              >
                <View style={styles.statLabelRow}>
                  <Text style={styles.statLabel}>Promedio x Gasto</Text>
                  <Text style={styles.infoIcon}>ⓘ</Text>
                </View>
                <Text style={styles.statValue}>
                  ${Math.round(promedio).toLocaleString("es-AR")}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Detalles del Mes</Text>
          </>
        }
        renderItem={renderGastoDetalle}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No registraste gastos este mes.</Text>
        }
      />

      {/* MODAL PERSONALIZADO OSCURO (Reemplaza a los Alerts) */}
      <Modal visible={modalConfig.visible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalConfig({ ...modalConfig, visible: false })}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* VISTA DE INFORMACIÓN (Estadísticas) */}
              {modalConfig.tipo === "info" && (
                <>
                  <Text style={styles.modalTitle}>{modalConfig.titulo}</Text>
                  <Text style={styles.modalText}>{modalConfig.mensaje}</Text>
                </>
              )}

              {/* VISTA DE DETALLE DE GASTO */}
              {modalConfig.tipo === "detalle" && modalConfig.gasto && (
                <>
                  <Text style={styles.modalTitle}>Detalle de Transacción</Text>

                  <View style={styles.detailBox}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Descripción:</Text>
                      <Text style={styles.detailValue}>
                        {modalConfig.gasto.description}
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
                        {Number(modalConfig.gasto.amount).toLocaleString(
                          "es-AR",
                        )}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fecha:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(
                          modalConfig.gasto.date + "T00:00:00",
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
                        {modalConfig.gasto.created_at
                          ? new Date(
                              modalConfig.gasto.created_at,
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
                        {modalConfig.gasto.categories?.icon
                          ? `${modalConfig.gasto.categories.icon} `
                          : ""}
                        {modalConfig.gasto.categories?.name || "Desconocido"}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.btnCerrar}
                onPress={() =>
                  setModalConfig({ ...modalConfig, visible: false })
                }
              >
                <Text style={styles.btnCerrarText}>Aceptar</Text>
              </TouchableOpacity>
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
  chartCard: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#F8FAFC" },
  chartSubtitle: { fontSize: 12, color: "#94A3B8", marginBottom: 24 },
  chartWrapper: { alignItems: "center", marginLeft: -15 },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
  },
  statLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: { fontSize: 13, color: "#94A3B8" },
  infoIcon: { fontSize: 12, color: "#3B82F6", fontWeight: "bold" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#F8FAFC" },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 16,
  },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 10 },
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
  cardIcon: { fontSize: 24, marginRight: 16 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 13, color: "#94A3B8" },
  cardAmount: { fontSize: 16, fontWeight: "bold", color: "#EF4444" },

  /* Estilos del Modal Personalizado */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    width: "100%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
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
