import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { supabase } from "../../../supabase";

const screenWidth = Dimensions.get("window").width;

const formatearMoneda = (valor) => {
  if (valor === undefined || valor === null) return "0,00";
  let partes = valor.toFixed(2).split(".");
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return partes.join(",");
};

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [gastos, setGastos] = useState([]);

  const [totalMes, setTotalMes] = useState(0);
  const [totalAnio, setTotalAnio] = useState(0);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [categoriasMes, setCategoriasMes] = useState([]);

  // NUEVO: Estado para controlar qué categoría está expandida viendo su detalle
  const [categoriaExpandida, setCategoriaExpandida] = useState(null);

  const fechaActual = new Date();
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
  const anioActual = fechaActual.getFullYear();

  useFocusEffect(
    useCallback(() => {
      fetchGastosYCalcular();
    }, []),
  );

  async function fetchGastosYCalcular() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name)")
        .order("date", { ascending: false }); // Ordenamos por fecha para que el detalle se vea ordenado

      if (error) throw error;

      if (data) {
        setGastos(data);

        const mesActualStr = String(fechaActual.getMonth() + 1).padStart(
          2,
          "0",
        );
        const anioActualStr = String(anioActual);

        // 1. CÁLCULO MENSUAL Y DESGLOSE POR CATEGORÍA
        const gastosMensuales = data.filter((gasto) => {
          if (!gasto.date) return false;
          return (
            gasto.date.substring(0, 4) === anioActualStr &&
            gasto.date.substring(5, 7) === mesActualStr
          );
        });

        setTotalMes(
          gastosMensuales.reduce((acc, gasto) => acc + gasto.amount, 0),
        );

        // Agrupamos los gastos guardando no solo el total, sino la lista completa de items
        const agrupadoPorCategoria = gastosMensuales.reduce((acc, gasto) => {
          const nombreCat = gasto.categories?.name || "Sin categoría";
          if (!acc[nombreCat]) {
            acc[nombreCat] = { total: 0, items: [] }; // Preparamos un array para guardar los gastos individuales
          }
          acc[nombreCat].total += gasto.amount;
          acc[nombreCat].items.push(gasto); // Guardamos el gasto entero
          return acc;
        }, {});

        // Convertimos a array para iterar
        const arrayCategorias = Object.keys(agrupadoPorCategoria)
          .map((key) => ({
            nombre: key,
            total: agrupadoPorCategoria[key].total,
            items: agrupadoPorCategoria[key].items, // Pasamos los items
          }))
          .sort((a, b) => b.total - a.total);

        setCategoriasMes(arrayCategorias);

        // 2. CÁLCULO ANUAL
        const gastosAnuales = data.filter((gasto) => {
          if (!gasto.date) return false;
          return gasto.date.substring(0, 4) === anioActualStr;
        });
        setTotalAnio(
          gastosAnuales.reduce((acc, gasto) => acc + gasto.amount, 0),
        );

        // 3. GRÁFICO (Últimos 6 meses)
        const labelsGrafico = [];
        const datosGrafico = [];

        for (let i = 5; i >= 0; i--) {
          const fechaIteracion = new Date();
          fechaIteracion.setMonth(fechaIteracion.getMonth() - i);

          const mesStr = String(fechaIteracion.getMonth() + 1).padStart(2, "0");
          const anioStr = String(fechaIteracion.getFullYear());

          const mesCorto = nombresMeses[fechaIteracion.getMonth()].substring(
            0,
            3,
          );
          labelsGrafico.push(mesCorto);

          const gastosDelMes = data.filter((g) => {
            if (!g.date) return false;
            return (
              g.date.substring(0, 4) === anioStr &&
              g.date.substring(5, 7) === mesStr
            );
          });

          datosGrafico.push(
            gastosDelMes.reduce((acc, curr) => acc + curr.amount, 0),
          );
        }

        setChartData({
          labels: labelsGrafico,
          datasets: [{ data: datosGrafico }],
        });
      }
    } catch (error) {
      console.error("Error al cargar datos:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir o cerrar el detalle de una categoría
  const toggleCategoria = (nombreCategoria) => {
    if (categoriaExpandida === nombreCategoria) {
      setCategoriaExpandida(null); // Si ya estaba abierta, la cerramos
    } else {
      setCategoriaExpandida(nombreCategoria); // Si no, la abrimos
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Calculando reportes...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Mis Reportes</Text>

      <View style={[styles.card, styles.mesCard]}>
        <Text style={styles.cardTitle}>Resumen de {nombreMes}</Text>
        <Text style={styles.amountText}>${formatearMoneda(totalMes)}</Text>
        <Text style={styles.subtitle}>Gasto total del mes actual</Text>
      </View>

      <View style={[styles.card, styles.anioCard]}>
        <Text style={styles.cardTitle}>Balance de {anioActual}</Text>
        <Text style={styles.amountText}>${formatearMoneda(totalAnio)}</Text>
        <Text style={styles.subtitle}>Gasto total acumulado del año</Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Últimos 6 Meses</Text>
        {chartData.datasets[0].data.length > 0 ? (
          <BarChart
            data={chartData}
            width={screenWidth - 40}
            height={240}
            yAxisLabel="$"
            chartConfig={chartConfig}
            style={styles.chartStyle}
            fromZero={true}
            showValuesOnTopOfBars={true}
          />
        ) : (
          <Text style={styles.emptyText}>No hay suficientes datos.</Text>
        )}
      </View>

      {/* Lista de Gastos por Categoría con Acordeón (Desplegable) */}
      <View style={styles.desgloseContainer}>
        <Text style={styles.desgloseTitle}>¿En qué gastaste este mes?</Text>
        {categoriasMes.length > 0 ? (
          categoriasMes.map((cat, index) => {
            const isExpanded = categoriaExpandida === cat.nombre;

            return (
              <View key={index} style={styles.categoriaContenedor}>
                {/* El botón para expandir/colapsar */}
                <TouchableOpacity
                  style={styles.categoriaRow}
                  onPress={() => toggleCategoria(cat.nombre)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoriaIzquierda}>
                    <Text style={styles.flechaExpandir}>
                      {isExpanded ? "▼" : "▶"}
                    </Text>
                    <Text style={styles.categoriaName}>{cat.nombre}</Text>
                  </View>
                  <Text style={styles.categoriaTotal}>
                    ${formatearMoneda(cat.total)}
                  </Text>
                </TouchableOpacity>

                {/* Si la categoría está expandida, mostramos la lista de ítems */}
                {isExpanded && (
                  <View style={styles.itemsContainer}>
                    {cat.items.map((item, i) => (
                      <View key={i} style={styles.itemRow}>
                        <View style={styles.itemIzquierda}>
                          <Text style={styles.itemFecha}>
                            {item.date.substring(8, 10)}/
                            {item.date.substring(5, 7)}
                          </Text>
                          <Text style={styles.itemDescripcion}>
                            {item.description}
                          </Text>
                        </View>
                        <Text style={styles.itemMonto}>
                          ${formatearMoneda(item.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            No hay gastos registrados en este mes.
          </Text>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#666", fontSize: 16 },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },

  card: {
    padding: 25,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    alignItems: "center",
  },
  mesCard: { backgroundColor: "#007bff" },
  anioCard: { backgroundColor: "#28a745" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "rgba(255, 255, 255, 0.9)",
  },
  amountText: {
    fontSize: 42,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  subtitle: { color: "rgba(255, 255, 255, 0.7)", fontSize: 14 },

  chartContainer: {
    backgroundColor: "white",
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
  },
  chartStyle: { borderRadius: 12 },

  // ESTILOS ACTUALIZADOS PARA EL ACORDEÓN DE CATEGORÍAS
  desgloseContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  desgloseTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },

  categoriaContenedor: { borderBottomWidth: 1, borderBottomColor: "#eee" },
  categoriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    alignItems: "center",
  },
  categoriaIzquierda: { flexDirection: "row", alignItems: "center" },
  flechaExpandir: {
    fontSize: 12,
    color: "#888",
    marginRight: 10,
    width: 15,
    textAlign: "center",
  },
  categoriaName: { fontSize: 16, color: "#444", fontWeight: "600" },
  categoriaTotal: { fontSize: 16, color: "#ff3b30", fontWeight: "bold" },

  // Estilos de los ítems individuales dentro de la categoría
  itemsContainer: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    alignItems: "center",
  },
  itemIzquierda: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemFecha: { fontSize: 12, color: "#888", marginRight: 10, width: 40 },
  itemDescripcion: { fontSize: 14, color: "#555", flex: 1 },
  itemMonto: { fontSize: 14, color: "#333", fontWeight: "500" },

  emptyText: {
    color: "#888",
    fontStyle: "italic",
    paddingBottom: 10,
    textAlign: "center",
  },
});
