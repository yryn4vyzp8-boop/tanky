import { Stack } from "expo-router";
import { PhoneFrame } from "../../components/PhoneFrame";

export default function PhoneLayout() {
  return (
    <PhoneFrame>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </PhoneFrame>
  );
}
