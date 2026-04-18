import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

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
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitting(true);
      await signIn(parsed.data.email, parsed.data.password);
    } catch (signInError) {
      const message =
        signInError instanceof Error
          ? signInError.message
          : "Unable to sign in right now.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
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
          {["Role-aware access", "Event-ready workflow", "Audited distribution records"].map((item) => (
            <View
              key={item}
              style={{
                paddingHorizontal: 12,
                minHeight: 34,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)"
              }}
            >
              <Text style={{ color: theme.colors.textOnDark, fontSize: 12, fontWeight: "700" }}>{item}</Text>
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

      <Button label={submitting ? "Signing in..." : "Sign in"} onPress={handleSignIn} />

      <View style={{ gap: 14 }}>
        <Link href="/forgot-password" asChild>
          <Pressable>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Forgot password?</Text>
          </Pressable>
        </Link>
        <Pressable onPress={() => router.push("/sign-up")}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
            New to QRelief? Create an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
