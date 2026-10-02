import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== SANITIZACIÓN DE ENTORNO ===");
console.log(`URL procesada (Longitud: ${supabaseUrl.length})`);
console.log(`KEY procesada (Longitud: ${supabaseAnonKey.length})`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
