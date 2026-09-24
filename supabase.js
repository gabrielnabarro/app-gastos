import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = "https://xldqujwpktlmwmsxcxan.supabase.co";
const supabaseAnonKey = "sb_publishable_fB-jp5_AK6W4F5pHflrO8w_FsGqeey1";

// Almacenamiento temporal en memoria para evitar errores nativos en Expo Go
const memoryStorage = {
  getItem: (key) => Promise.resolve(null),
  setItem: (key, value) => Promise.resolve(),
  removeItem: (key) => Promise.resolve(),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: memoryStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
