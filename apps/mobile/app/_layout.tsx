import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../lib/auth-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="demo-control" options={{ presentation: "modal" }} />
          <Stack.Screen name="admin" />
          <Stack.Screen name="(phone)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
