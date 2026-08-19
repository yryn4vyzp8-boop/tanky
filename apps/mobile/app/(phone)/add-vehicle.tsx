import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useRouter } from "expo-router";
import type { FuelType } from "@tanky/domain";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Button } from "../../components/Button";
import { api, ApiError } from "../../lib/api-client";
import { fuelTypeLabel } from "../../lib/format";
import { colors, radius, spacing, typography } from "../../lib/theme";

const FUEL_TYPES: FuelType[] = ["PETROL_95", "PETROL_98", "DIESEL"];

export default function AddVehicleScreen() {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("PETROL_95");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!make.trim() || !model.trim() || !licensePlate.trim()) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.vehicles.create({ make: make.trim(), model: model.trim(), licensePlate: licensePlate.trim(), fuelType });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Fahrzeug konnte nicht gespeichert werden");
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer style={styles.container}>
      <View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Zurück</Text>
        </Pressable>
        <Text style={styles.title}>Fahrzeug hinzufügen</Text>
      </View>

      <View style={styles.row}>
        <Field style={{ flex: 1 }} label="Marke" value={make} onChangeText={setMake} placeholder="Mercedes-AMG" />
        <Field style={{ flex: 1 }} label="Modell" value={model} onChangeText={setModel} placeholder="GLC 63" />
      </View>
      <Field
        label="Kennzeichen"
        value={licensePlate}
        onChangeText={setLicensePlate}
        placeholder="LU 123 456"
        autoCapitalize="characters"
      />

      <Text style={styles.sectionTitle}>Kraftstoff</Text>
      <View style={styles.segmented}>
        {FUEL_TYPES.map((ft) => (
          <Pressable key={ft} style={[styles.segment, fuelType === ft && styles.segmentActive]} onPress={() => setFuelType(ft)}>
            <Text style={[styles.segmentText, fuelType === ft && styles.segmentTextActive]}>{fuelTypeLabel(ft)}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button onPress={onSubmit} loading={submitting}>
        Fahrzeug speichern
      </Button>
    </ScreenContainer>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
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
        placeholder={props.placeholder}
        autoCapitalize={props.autoCapitalize ?? "words"}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  back: { color: colors.primaryMuted, ...typography.captionStrong, marginBottom: spacing.md },
  title: { color: colors.textPrimary, ...typography.title },
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
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  sectionTitle: { color: colors.textSecondary, ...typography.captionStrong },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  segmentActive: { backgroundColor: colors.primaryTint },
  segmentText: { color: colors.textMuted, ...typography.caption },
  segmentTextActive: { color: colors.primaryMuted, fontWeight: "700" },
  error: { color: colors.danger, ...typography.caption },
});
