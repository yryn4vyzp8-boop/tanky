import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "./auth-context";

/** Redirects to login if there's no authenticated user once the initial auth check has finished. */
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(phone)/login");
    }
  }, [isLoading, user, router]);

  return { user, isLoading, isReady: !isLoading && Boolean(user) };
}
