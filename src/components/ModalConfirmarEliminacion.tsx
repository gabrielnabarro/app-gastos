// src/components/ModalConfirmarEliminacion.tsx
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface ModalConfirmarEliminacionProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ModalConfirmarEliminacion({
  visible,
  onClose,
  onConfirm,
}: ModalConfirmarEliminacionProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Eliminar Gasto</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se
              puede deshacer.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={onClose}
              >
                <Text style={styles.btnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#EF4444" }]}
                onPress={onConfirm}
              >
                <Text style={styles.btnTextSave}>Eliminar</Text>
              </TouchableOpacity>
            </View>
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
  modalText: {
    fontSize: 15,
    color: "#94A3B8",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: "#334155" },
  btnTextCancel: { color: "#F8FAFC", fontWeight: "600" },
  btnTextSave: { color: "#FFF", fontWeight: "bold" },
});
