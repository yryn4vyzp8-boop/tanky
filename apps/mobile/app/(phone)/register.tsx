import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Link, useRouter } from "expo-router";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Button } from "../../components/Button";
import { useAuth } from "../../lib/auth-context";
import { ApiError } from "../../lib/api-client";
import { colors, radius, spacing, typography } from "../../lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Bitte Vor- und Nachname angeben.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email: email.trim(), password });
      router.replace("/(phone)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Konto erstellen</Text>
        <Text style={styles.subtitle}>Dauert weniger als eine Minute.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.row}>
          <Field style={{ flex: 1 }} label="Vorname" value={firstName} onChangeText={setFirstName} />
          <Field style={{ flex: 1 }} label="Nachname" value={lastName} onChangeText={setLastName} />
        </View>
        <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Passwort (min. 8 Zeichen)" value={password} onChangeText={setPassword} secureTextEntry />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button onPress={onSubmit} loading={loading}>
          Registrieren
        </Button>
      </View>

      <Link href="/(phone)/login" style={styles.link}>
        Bereits ein Konto? Anmelden
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
  style?: object;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, props.style]}>
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
  header: { marginBottom: spacing.xl },
  title: { color: colors.textPrimary, ...typography.title },
  subtitle: { color: colors.textSecondary, ...typography.body, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
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
  link: { color: colors.primaryMuted, textAlign: "center", marginTop: spacing.xl, ...typography.captionStrong },
});
