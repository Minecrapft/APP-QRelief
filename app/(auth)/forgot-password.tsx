import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { passwordResetRequestSchema } from "@/lib/validation/auth";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset, loading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    setMessage(null);
    const parsed = passwordResetRequestSchema.safeParse({ email: email.trim() });

    if (!parsed.success) {
      const validationMessage = parsed.error.issues[0]?.message ?? "Enter a valid email address.";
      setError(validationMessage);
      showToast(validationMessage, "error");
      return;
    }

    try {
      await requestPasswordReset(parsed.data.email);
      const successMessage = "Reset instructions have been sent if the account exists.";
      setMessage(successMessage);
      showToast(successMessage, "success");
    } catch (resetError) {
      const message =
        resetError instanceof Error
          ? resetError.message
          : "Unable to send reset email right now.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="Reset password"
      subtitle="We’ll send a recovery link so you can securely set a new password."
    >
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="name@example.com"
      />

      {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "#166534" }}>{message}</Text> : null}

      <Button label={loading ? "Sending..." : "Send reset link"} onPress={handleReset} />
    </Screen>
  );
}
