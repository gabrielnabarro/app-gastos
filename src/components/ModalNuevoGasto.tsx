// src/components/ModalNuevoGasto.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { Category } from "../hooks/useVoiceExpense";

interface ModalNuevoGastoProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  description: string;
  setDescription: (text: string) => void;
  amount: string;
  setAmount: (text: string) => void;
  date: Date;
  setDate: (date: Date) => void;
  categorias: Category[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
}

export default function ModalNuevoGasto({
  visible,
  onClose,
  onSave,
  description,
  setDescription,
  amount,
  setAmount,
  date,
  setDate,
  categorias,
  selectedCategoryId,
  setSelectedCategoryId,
  showDatePicker,
  setShowDatePicker,
}: ModalNuevoGastoProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
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
                        selectedCategoryId === cat.id && styles.chipTextActive,
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
                  onPress={onClose}
                >
                  <Text style={styles.btnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSave]}
                  onPress={onSave}
                >
                  <Text style={styles.btnTextSave}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
});
