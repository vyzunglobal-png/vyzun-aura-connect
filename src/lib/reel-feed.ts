import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const REEL_CATEGORIES = ["For You", "Vibe With", "Trending", "New", "Comedy"] as const;
export type ReelCategory = typeof REEL_CATEGORIES[number];

export function useReelFeed(category: ReelCategory, userId?: string, own = false, targetId?: string) {
  return useQuery({ queryKey: ["reel-feed", category, userId, own, targetId], enabled: category !== "Vibe With" || !!userId, retry: 1, staleTime: 30_000,
    queryFn: async () => {
      let query = supabase.from("reels").select("id,creator_id,caption,hashtags,video_url,thumbnail_url,audio_label,views_count,category,duration_seconds").eq("is_published", true).eq("moderation_state", "approved");
      if (own && userId) query = query.eq("creator_id", userId);
      if (category === "Comedy") query = query.eq("category", "comedy");
      if (category === "Vibe With" && userId) {
        const { data, error } = await supabase.from("social_connections").select("following_id").eq("follower_id", userId);
        if (error) throw error;
        if (!data?.length) return [];
        query = query.in("creator_id", data.map(row => row.following_id));
      }
      const { data, error } = await query.order(category === "Trending" ? "views_count" : "created_at", { ascending: false }).limit(30);
      if (error) throw error;
      let rows = data ?? [];
      if (targetId && !rows.some(row => row.id === targetId)) {
        const { data: target, error: targetError } = await supabase.from("reels").select("id,creator_id,caption,hashtags,video_url,thumbnail_url,audio_label,views_count,category,duration_seconds").eq("id", targetId).eq("is_published", true).eq("moderation_state", "approved").maybeSingle();
        if (targetError) throw targetError;
        if (target) rows = [target, ...rows];
      }
      const ids = [...new Set(rows.map(row => row.creator_id))];
      const { data: profiles, error: profileError } = ids.length ? await supabase.from("profiles").select("id,username,bio,avatar_url,is_verified").in("id", ids) : { data: [], error: null };
      if (profileError) throw profileError;
      return rows.filter(row => row.video_url).map(row => ({ ...row, creator: profiles?.find(profile => profile.id === row.creator_id) }));
    },
  });
}