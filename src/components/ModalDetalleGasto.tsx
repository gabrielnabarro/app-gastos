// src/components/ModalDetalleGasto.tsx
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

// Definimos la estructura del gasto esperado
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
  category_id: string;
  payment_method_id: string | null;
  categories: { name: string; icon: string };
}

interface ModalDetalleGastoProps {
  visible: boolean;
  onClose: () => void;
  gasto: Transaction | null;
}

export default function ModalDetalleGasto({
  visible,
  onClose,
  gasto,
}: ModalDetalleGastoProps) {
  // Si no hay un gasto seleccionado, no renderizamos nada para evitar errores
  if (!gasto) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalle de Transacción</Text>
            <View style={styles.detailBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Descripción:</Text>
                <Text style={styles.detailValue}>{gasto.description}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monto:</Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: "#EF4444", fontWeight: "bold" },
                  ]}
                >
                  ${Number(gasto.amount).toLocaleString("es-AR")}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha:</Text>
                <Text style={styles.detailValue}>
                  {new Date(gasto.date + "T00:00:00").toLocaleDateString(
                    "es-AR",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Horario:</Text>
                <Text style={styles.detailValue}>
                  {gasto.created_at
                    ? new Date(gasto.created_at).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No disponible"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Categoría:</Text>
                <Text style={styles.detailValue}>
                  {gasto.categories?.icon ? `${gasto.categories.icon} ` : ""}
                  {gasto.categories?.name || "Desconocido"}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnCerrar} onPress={onClose}>
              <Text style={styles.btnCerrarText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
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
