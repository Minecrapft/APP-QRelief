import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { signInSchema } from "@/lib/validation/auth";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function SignInScreen() {
  const { signIn, loading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    const parsed = signInSchema.safeParse({ email: email.trim(), password });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please review your sign-in details.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      await signIn(parsed.data.email, parsed.data.password);
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : "Unable to sign in right now.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="QRelief"
      subtitle="Secure disaster-relief access for beneficiaries, staff, and administrators."
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Secure Access"
          title="Sign in to your operations workspace"
          subtitle="Field teams, beneficiaries, and administrators use the same secure entry point with role-based routing."
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Role-aware access", icon: "verified-user" as const },
            { label: "Event-ready workflow", icon: "emergency" as const },
            { label: "Audited records", icon: "fact-check" as const }
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                gap: 8,
                paddingHorizontal: 12,
                minHeight: 34,
                borderRadius: theme.radii.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)"
              }}
            >
              <MaterialIcons name={item.icon} size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textOnDark, fontSize: 12, fontFamily: theme.fonts.ui }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="name@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        placeholder="Enter your password"
      />

      {error ? (
        <Panel tone="warning">
          <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{error}</Text>
        </Panel>
      ) : null}

      <Button label={loading ? "Signing in..." : "Sign in"} onPress={handleSignIn} />

      <View style={{ gap: 14 }}>
        <Link href="/forgot-password" asChild>
          <Pressable>
            <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.ui }}>Forgot password?</Text>
          </Pressable>
        </Link>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.ui }}>
            New to QRelief? Create an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
