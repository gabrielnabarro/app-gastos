import { Redirect } from "expo-router";

export default function Index() {
  // Al abrir la app, redirige siempre al login.
  // El _layout.tsx se encargará de mandarlo a las tabs si ya hay sesión.
  return <Redirect href="/login" />;
}
