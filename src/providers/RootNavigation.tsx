import { PropsWithChildren, useEffect } from "react";
import { usePathname, useRouter, useSegments } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

const AUTH_PATHS = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password"
]);

export function RootNavigation({ children }: PropsWithChildren) {
  const { isAuthenticated, loading, role, beneficiaryRecord } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated) {
      if (!AUTH_PATHS.has(pathname)) {
        router.replace("/sign-in");
      }
      return;
    }

    if (role === "beneficiary" && beneficiaryRecord?.status !== "approved") {
      if (pathname !== "/pending") {
        router.replace("/pending");
      }
      return;
    }

    const currentGroup = segments[0];
    const expectedGroup =
      role === "admin" ? "(admin)" : role === "staff" ? "(staff)" : "(beneficiary)";

    if (currentGroup !== expectedGroup || inAuthGroup || pathname === "/" || pathname === "/pending") {
      if (role === "admin") {
        router.replace("/(admin)");
        return;
      }

      if (role === "staff") {
        router.replace("/(staff)");
        return;
      }

      router.replace("/(beneficiary)");
    }
  }, [beneficiaryRecord?.status, isAuthenticated, loading, pathname, role, router, segments]);

  return children;
}
