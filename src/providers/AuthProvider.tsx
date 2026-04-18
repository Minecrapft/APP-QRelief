import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";

import { validateStaffInvitation } from "@/features/admin/operations";
import { supabase } from "@/lib/supabase/client";
import {
  AppRole,
  AuthContextValue,
  BeneficiaryRecord,
  ProfileRecord,
  SignUpPayload
} from "@/types/domain";

const SESSION_KEY = "qrelief.auth.token";

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(session: Session | null) {
  if (!session) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [beneficiaryRecord, setBeneficiaryRecord] = useState<BeneficiaryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateProfile = async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setProfile(null);
      setBeneficiaryRecord(null);
      return;
    }

    const userId = nextSession.user.id;

    const [
      { data: profileData, error: profileError },
      { data: beneficiaryData, error: beneficiaryError }
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("beneficiaries").select("*").eq("id", userId).maybeSingle()
    ]);

    if (profileError) {
      throw profileError;
    }

    if (beneficiaryError) {
      throw beneficiaryError;
    }

    setProfile(profileData as ProfileRecord);
    setBeneficiaryRecord((beneficiaryData as BeneficiaryRecord | null) ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const storedSession = await SecureStore.getItemAsync(SESSION_KEY);

        if (storedSession) {
          const parsedSession = JSON.parse(storedSession) as Session;
          const { data, error } = await supabase.auth.setSession({
            access_token: parsedSession.access_token,
            refresh_token: parsedSession.refresh_token
          });

          if (error) {
            throw error;
          }

          if (isMounted) {
            setSession(data.session);
            await hydrateProfile(data.session);
          }
        } else {
          const { data } = await supabase.auth.getSession();

          if (isMounted) {
            setSession(data.session);
            await hydrateProfile(data.session);
          }
        }
      } catch (error) {
        console.warn("Failed to restore session", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      await persistSession(nextSession);
      await hydrateProfile(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      throw error;
    }

    setSession(data.session);
    await persistSession(data.session);
    await hydrateProfile(data.session);
    setLoading(false);
  };

  const signUp = async ({ email, password, role, fullName, beneficiaryData, inviteCode }: SignUpPayload) => {
    setLoading(true);

    let resolvedFullName = fullName;
    let resolvedInviteCode: string | undefined;

    if (role === "staff") {
      const invitation = await validateStaffInvitation(email, inviteCode ?? "");
      resolvedFullName = invitation.full_name;
      resolvedInviteCode = invitation.invite_code;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: resolvedFullName,
          invite_code: resolvedInviteCode ?? null
        }
      }
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    const userId = data.user?.id;

    if (userId && role === "beneficiary" && beneficiaryData) {
      const { error: beneficiaryError } = await supabase.from("beneficiaries").upsert({
        id: userId,
        ...beneficiaryData
      });

      if (beneficiaryError) {
        setLoading(false);
        throw beneficiaryError;
      }
    }

    setLoading(false);
    router.replace("/sign-in");
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "qrelief://reset-password"
    });
    setLoading(false);

    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    await persistSession(null);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setBeneficiaryRecord(null);
    setLoading(false);
    router.replace("/sign-in");
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      beneficiaryRecord,
      loading,
      isAuthenticated: Boolean(session),
      role: (profile?.role as AppRole | undefined) ?? null,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile: () => hydrateProfile(session)
    }),
    [beneficiaryRecord, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
