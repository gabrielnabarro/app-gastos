import * as ExpoAudio from "expo-audio";
import { File } from "expo-file-system";
import { useRef, useState } from "react";
import { Alert, Platform } from "react-native";

// Leemos la API KEY de forma segura
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
const RETRYABLE_STATUS = [429, 500, 503, 504];
const MIN_RECORDING_MS = 1500;

const RECORDING_OPTIONS: ExpoAudio.RecordingOptions = {
  extension: Platform.OS === "ios" ? ".wav" : ".aac",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    extension: ".aac",
    outputFormat: "aac_adts",
    audioEncoder: "aac",
  },
  ios: {
    outputFormat: ExpoAudio.IOSOutputFormat.LINEARPCM,
    audioQuality: ExpoAudio.AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

async function callGemini(body: object) {
  let lastError = "error desconocido";
  for (const model of GEMINI_MODELS) {
    for (let intento = 0; intento < 3; intento++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify(body),
          },
        );
        const data = await response.json();
        if (response.ok && !data.error) return data;

        lastError = `Gemini (${response.status}): ${data?.error?.message ?? "error desconocido"}`;
        if (!RETRYABLE_STATUS.includes(response.status)) {
          if (response.status === 404) break;
          throw new Error(lastError);
        }
      } catch (e: any) {
        if (e?.message?.startsWith("Gemini (")) throw e;
        lastError = e?.message ?? lastError;
      }
      await sleep(800 * 2 ** intento);
    }
  }
  throw new Error(
    `${lastError}\n\nEl servicio de IA está saturado. Probá de nuevo en unos segundos.`,
  );
}

// Exportamos las interfaces necesarias
export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface ExpenseResult {
  description: string;
  amount: string;
  date: Date;
  categoryId: string;
}

export function useVoiceExpense(categorias: Category[]) {
  const audioRecorder = ExpoAudio.useAudioRecorder(RECORDING_OPTIONS);

  const isHolding = useRef(false);
  const isStartingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const pressStartTime = useRef<number>(0);

  const [isRecordingUI, setIsRecordingUI] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const releaseAudioSession = async () => {
    try {
      await ExpoAudio.setAudioModeAsync({ allowsRecording: false });
    } catch (e) {
      console.warn("No se pudo liberar la sesión de audio:", e);
    }
  };

  const startRecording = async () => {
    if (isRecordingRef.current || isStartingRef.current || isProcessingVoice)
      return;

    if (categorias.length === 0) {
      Alert.alert(
        "Atención",
        "Debes crear categorías antes de agregar gastos.",
      );
      return;
    }

    isHolding.current = true;
    isStartingRef.current = true;

    try {
      const { granted } = await ExpoAudio.requestRecordingPermissionsAsync();
      if (!granted) {
        isHolding.current = false;
        Alert.alert(
          "Permiso denegado",
          "Ve a la Configuración de tu celular y activa el Micrófono.",
        );
        return;
      }

      await ExpoAudio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();

      if (!isHolding.current) {
        await audioRecorder.stop().catch(() => {});
        await releaseAudioSession();
        return;
      }

      audioRecorder.record();
      pressStartTime.current = Date.now();
      isRecordingRef.current = true;
      setIsRecordingUI(true);
    } catch (err: any) {
      console.error("Error al iniciar grabación:", err);
      isHolding.current = false;
      isRecordingRef.current = false;
      setIsRecordingUI(false);
      await audioRecorder.stop().catch(() => {});
      await releaseAudioSession();
      Alert.alert(
        "No se pudo iniciar la grabación",
        err?.message || "No se pudo encender el micrófono.",
      );
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopRecordingAndProcess = async (): Promise<ExpenseResult | null> => {
    isHolding.current = false;
    if (!isRecordingRef.current) return null;

    isRecordingRef.current = false;
    setIsRecordingUI(false);
    const pressDuration = Date.now() - pressStartTime.current;

    try {
      await audioRecorder.stop();
    } catch (e) {
      console.warn("Error al detener la grabación:", e);
    }
    await releaseAudioSession();

    if (pressDuration < MIN_RECORDING_MS) {
      Alert.alert(
        "Audio muy corto",
        "Mantén presionado el botón por más de 1.5 segundos para dictar tu gasto.",
      );
      return null;
    }

    setIsProcessingVoice(true);
    try {
      if (!GEMINI_API_KEY) {
        throw new Error(
          "Falta configurar la API Key de Gemini en tu archivo .env",
        );
      }

      const uri = audioRecorder.uri;
      if (!uri) throw new Error("El sistema no guardó el archivo de audio.");

      const base64Audio = await new File(uri).base64();
      const mimeType = uri.toLowerCase().endsWith(".wav")
        ? "audio/wav"
        : "audio/aac";

      const fechaHoy = toLocalISODate(new Date());
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

      const data = await callGemini({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64Audio } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });

      // Extracción robusta de JSON, ignorando posibles saludos de la IA
      let jsonText: string = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text ?? "")
        .join("");

      const jsonStart = jsonText.indexOf("{");
      const jsonEnd = jsonText.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("La IA no devolvió un formato JSON válido.");
      }

      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      const gastoIA = JSON.parse(jsonText);

      const monto = Number(gastoIA.amount);
      if (!Number.isFinite(monto)) {
        throw new Error("No se pudo entender el monto. Intenta de nuevo.");
      }

      const categoriaEncontrada = categorias.find(
        (c) =>
          c.name.toLowerCase() === String(gastoIA.category ?? "").toLowerCase(),
      );

      return {
        description: String(gastoIA.description ?? ""),
        amount: String(monto),
        date: gastoIA.date ? new Date(gastoIA.date + "T00:00:00") : new Date(),
        categoryId: categoriaEncontrada?.id ?? "",
      };
    } catch (err: any) {
      console.error("Error procesando voz", err);
      Alert.alert(
        "No se pudo procesar",
        err?.message ||
          "Asegúrate de hablar claro e indicar monto y descripción.",
      );
      return null;
    } finally {
      setIsProcessingVoice(false);
    }
  };

  return {
    isRecordingUI,
    isProcessingVoice,
    startRecording,
    stopRecordingAndProcess,
  };
}
