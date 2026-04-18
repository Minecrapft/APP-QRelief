import { useState } from "react";
import { Text } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { passwordUpdateSchema } from "@/lib/validation/auth";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function ResetPasswordScreen() {
  const { updatePassword, loading } = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    setError(null);
    setMessage(null);
    const parsed = passwordUpdateSchema.safeParse({ password, confirmPassword });

    if (!parsed.success) {
      const validationMessage = parsed.error.issues[0]?.message ?? "Please review your password.";
      setError(validationMessage);
      showToast(validationMessage, "error");
      return;
    }

    try {
      await updatePassword(parsed.data.password);
      const successMessage = "Password updated. You can now continue in the app.";
      setMessage(successMessage);
      showToast(successMessage, "success");
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Unable to update password right now.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <Screen
      title="Choose a new password"
      subtitle="Finish the recovery flow by setting a new password for your account."
    >
      <Input
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="New password"
      />
      <Input
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        placeholder="Confirm password"
      />

      {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}
      {message ? <Text style={{ color: "#166534" }}>{message}</Text> : null}

      <Button
        label={loading ? "Updating..." : "Update password"}
        onPress={handleUpdatePassword}
      />
    </Screen>
  );
}
