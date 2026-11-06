import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type VyzunProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_private: boolean;
  vibers_count: number;
  vibing_count: number;
  language: string;
  currency: string;
  country_code: string | null;
};

/**
 * Real Cloud session + profile. Guest users get `session === null` and keep
 * using local state; nothing here fabricates an authenticated state.
 */
export function useVyzunSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<VyzunProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(next ?? null);
      if (!next) setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let active = true;
    supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_url, is_verified, is_private, vibers_count, vibing_count, language, currency, country_code",
      )
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setProfile(data as VyzunProfile);
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  return { session, profile, loading, isAuthenticated: !!session };
}
