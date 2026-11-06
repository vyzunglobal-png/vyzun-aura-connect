import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-authorized account + creator-economy reads/writes.
 * Money records are never written from the client: creator_earnings,
 * creator_payouts, subscriptions and payments are read-only for users and
 * are only created by verified server-side settlement / payment webhooks.
 */

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_.]+$/, "Use letters, numbers, dot or underscore");

export const claimProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        username: usernameSchema,
        displayName: z.string().trim().max(48).optional(),
        language: z.string().trim().max(10).optional(),
        countryCode: z.string().trim().length(2).optional(),
        currency: z.string().trim().length(3).optional(),
        timezone: z.string().trim().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .neq("id", userId)
      .maybeSingle();
    if (taken) return { ok: false as const, error: "username_taken" };

    const { error } = await supabase
      .from("profiles")
      .update({
        username: data.username,
        display_name: data.displayName || data.username,
        ...(data.language ? { language: data.language } : {}),
        ...(data.countryCode ? { country_code: data.countryCode.toUpperCase() } : {}),
        ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
        ...(data.timezone ? { timezone: data.timezone } : {}),
      })
      .eq("id", userId);

    if (error) return { ok: false as const, error: "update_failed" };
    return { ok: true as const };
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        theme: z.enum(["dark-neon", "light-glass", "system"]).optional(),
        app_language: z.string().max(10).optional(),
        reduced_motion: z.boolean().optional(),
        data_saver: z.boolean().optional(),
        reel_autoplay: z.boolean().optional(),
        video_quality: z.enum(["auto", "low", "medium", "high"]).optional(),
        who_can_message: z.enum(["everyone", "vibers", "nobody"]).optional(),
        who_can_call: z.enum(["everyone", "vibers", "nobody"]).optional(),
        who_can_send_secrets: z.enum(["everyone", "vibers", "nobody"]).optional(),
        searchable: z.boolean().optional(),
        read_receipts: z.boolean().optional(),
        push_enabled: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      ...(data.theme !== undefined ? { theme: data.theme } : {}),
      ...(data.app_language !== undefined ? { app_language: data.app_language } : {}),
      ...(data.reduced_motion !== undefined ? { reduced_motion: data.reduced_motion } : {}),
      ...(data.data_saver !== undefined ? { data_saver: data.data_saver } : {}),
      ...(data.reel_autoplay !== undefined ? { reel_autoplay: data.reel_autoplay } : {}),
      ...(data.video_quality !== undefined ? { video_quality: data.video_quality } : {}),
      ...(data.who_can_message !== undefined ? { who_can_message: data.who_can_message } : {}),
      ...(data.who_can_call !== undefined ? { who_can_call: data.who_can_call } : {}),
      ...(data.who_can_send_secrets !== undefined
        ? { who_can_send_secrets: data.who_can_send_secrets }
        : {}),
      ...(data.searchable !== undefined ? { searchable: data.searchable } : {}),
      ...(data.read_receipts !== undefined ? { read_receipts: data.read_receipts } : {}),
      ...(data.push_enabled !== undefined ? { push_enabled: data.push_enabled } : {}),
    };
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("user_preferences")
      .update(patch)
      .eq("user_id", context.userId);
    return { ok: !error };
  });

/** Real-money creator summary. Amounts come only from the settled ledger. */
export const getCreatorSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: earnings, error: earningsError }, { data: payouts, error: payoutsError }, { data: creator, error: creatorError }] = await Promise.all([
      supabase
        .from("creator_earnings")
        .select("source, state, net_amount, currency, created_at")
        .eq("user_id", userId),
      supabase
        .from("creator_payouts")
        .select("id, amount, currency, state, requested_at, settled_at, failure_reason")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false })
        .limit(20),
      supabase
        .from("creator_profiles")
        .select("is_monetization_enabled, eligibility_state, payout_currency, payout_method_state, tax_status")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    if (earningsError || payoutsError || creatorError) throw new Error("Creator accounting is unavailable.");
    const rows = earnings ?? [];
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const sum = (fn: (r: (typeof rows)[number]) => boolean) =>
      rows.filter(fn).reduce((t, r) => t + Number(r.net_amount ?? 0), 0);

    const bySource: Record<string, number> = {};
    for (const r of rows) bySource[r.source] = (bySource[r.source] ?? 0) + Number(r.net_amount ?? 0);

    return {
      currency: creator?.payout_currency ?? rows[0]?.currency ?? null,
      monetizationEnabled: creator?.is_monetization_enabled ?? false,
      eligibilityState: creator?.eligibility_state ?? "not_applied",
      payoutMethodState: creator?.payout_method_state ?? "not_configured",
      taxStatus: creator?.tax_status ?? "not_provided",
      totals: {
        total: sum(() => true),
        thisMonth: sum((r) => new Date(r.created_at) >= monthStart),
        pending: sum((r) => r.state === "pending"),
        available: sum((r) => r.state === "available"),
        paid: sum((r) => r.state === "paid"),
      },
      bySource,
      payouts: payouts ?? [],
    };
  });
