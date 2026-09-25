import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- NUEVO IMPORT
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xldqujwpktlmwmsxcxan.supabase.co";
const supabaseAnonKey = "sb_publishable_fB-jp5_AK6W4F5pHflrO8w_FsGqeey1";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // <-- LE DECIMOS A SUPABASE QUE USE LA CAJA FUERTE
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
