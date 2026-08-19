import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Link, useRouter } from "expo-router";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Button } from "../../components/Button";
import { useAuth } from "../../lib/auth-context";
import { ApiError } from "../../lib/api-client";
import { colors, radius, spacing, typography } from "../../lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("demo@tanky.ch");
  const [password, setPassword] = useState("tanky-demo-2026");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(phone)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>TANKY</Text>
        <Text style={styles.subtitle}>Anmelden, um loszutanken.</Text>
      </View>

      <View style={styles.form}>
        <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Passwort" value={password} onChangeText={setPassword} secureTextEntry />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button onPress={onSubmit} loading={loading}>
          Anmelden
        </Button>
      </View>

      <View style={styles.demoHint}>
        <Text style={styles.demoHintText}>Demo-Konto vorausgefüllt — einfach auf „Anmelden“ tippen.</Text>
      </View>

      <Link href="/(phone)/register" style={styles.link}>
        Noch kein Konto? Jetzt registrieren
      </Link>
    </ScreenContainer>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
        keyboardType={props.keyboardType ?? "default"}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.xxl },
  wordmark: { color: colors.textPrimary, fontSize: 40, fontWeight: "800", letterSpacing: -1.5 },
  subtitle: { color: colors.textSecondary, ...typography.body, marginTop: spacing.sm },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  fieldLabel: { color: colors.textSecondary, ...typography.captionStrong },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  error: { color: colors.danger, ...typography.caption },
  demoHint: { marginTop: spacing.lg, alignItems: "center" },
  demoHintText: { color: colors.textMuted, ...typography.caption, textAlign: "center" },
  link: { color: colors.primaryMuted, textAlign: "center", marginTop: spacing.xl, ...typography.captionStrong },
});
