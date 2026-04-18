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

const AuthContext = createContext<AuthContextValue | null>(null);

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
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        await hydrateProfile(currentSession);
      } catch (error) {
        console.warn("Failed to restore auth session", error);
        if (isMounted) {
          setSession(null);
          setProfile(null);
          setBeneficiaryRecord(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);

      void (async () => {
        try {
          setSession(nextSession);
          await hydrateProfile(nextSession);
        } catch (error) {
          console.warn("Failed to hydrate profile after auth change", error);
          setProfile(null);
          setBeneficiaryRecord(null);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      setSession(data.session);
      await hydrateProfile(data.session);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async ({ email, password, role, fullName, beneficiaryData, inviteCode }: SignUpPayload) => {
    setLoading(true);

    try {
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
        throw error;
      }

      const userId = data.user?.id;

      if (userId && role === "beneficiary" && beneficiaryData) {
        const { error: beneficiaryError } = await supabase.from("beneficiaries").upsert({
          id: userId,
          ...beneficiaryData
        });

        if (beneficiaryError) {
          throw beneficiaryError;
        }
      }

      router.replace("/sign-in");
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "qrelief://reset-password"
      });

      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);

    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setBeneficiaryRecord(null);
      router.replace("/sign-in");
    } finally {
      setLoading(false);
    }
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
    [beneficiaryRecord, loading, profile, session]
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
