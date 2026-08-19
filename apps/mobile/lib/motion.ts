import { Easing } from "react-native";

// Apple's strong ease-out — use for all entrance animations
export const STRONG_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Critically damped springs — no bounce for UI (Apple default: damping 1.0)
export const SPRING_PRESS_IN  = { speed: 60, bounciness: 0, useNativeDriver: true } as const;
export const SPRING_PRESS_OUT = { speed: 45, bounciness: 0, useNativeDriver: true } as const;

// Entrance spring — settles cleanly, no overshoot
export const SPRING_ENTRANCE = { tension: 100, friction: 14, useNativeDriver: true } as const;

// Celebration spring — slight bounce, only for rare moments (completion, success)
export const SPRING_CELEBRATION = { tension: 90, friction: 7, useNativeDriver: true } as const;
