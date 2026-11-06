-- VYZUN complete database schema (generated from applied migrations)
-- NO virtual currency tables. NO leaderboard tables. Real-money ledger only.

-- ===== supabase/migrations/20260831052453_939732ba-25a6-44d8-b48f-72cc6ed17ce8.sql =====
-- ============ VYZUN core schema (identity + social) ============
-- NOTE: VYZUN has NO virtual currency and NO leaderboard architecture.

CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.reaction_key AS ENUM ('vibe','curious','savage','lol');
CREATE TYPE public.scan_mode AS ENUM ('secrets','love','future');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------------- profiles ----------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  country_code TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  vibers_count INTEGER NOT NULL DEFAULT 0,
  vibing_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (is_private = false OR auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles delete own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- roles ----------------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'));
$$;
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------------- preferences ----------------
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark-neon',
  neon_intensity SMALLINT NOT NULL DEFAULT 2,
  animation_level TEXT NOT NULL DEFAULT 'full',
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  font_scale NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  app_language TEXT NOT NULL DEFAULT 'en',
  content_languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  translation_language TEXT,
  region TEXT,
  currency_display TEXT,
  data_saver BOOLEAN NOT NULL DEFAULT false,
  wifi_only_downloads BOOLEAN NOT NULL DEFAULT true,
  reel_autoplay BOOLEAN NOT NULL DEFAULT true,
  video_quality TEXT NOT NULL DEFAULT 'auto',
  captions_enabled BOOLEAN NOT NULL DEFAULT false,
  muted_words TEXT[] NOT NULL DEFAULT '{}',
  sensitive_content TEXT NOT NULL DEFAULT 'standard',
  who_can_message TEXT NOT NULL DEFAULT 'everyone',
  who_can_call TEXT NOT NULL DEFAULT 'vibers',
  who_can_send_secrets TEXT NOT NULL DEFAULT 'everyone',
  who_can_comment TEXT NOT NULL DEFAULT 'everyone',
  who_can_tag TEXT NOT NULL DEFAULT 'everyone',
  searchable BOOLEAN NOT NULL DEFAULT true,
  contact_discovery BOOLEAN NOT NULL DEFAULT false,
  show_online_status BOOLEAN NOT NULL DEFAULT true,
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  typing_indicators BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start SMALLINT,
  quiet_hours_end SMALLINT,
  personalization BOOLEAN NOT NULL DEFAULT true,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs own" ON public.user_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- scans + aura ----------------
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.scan_mode NOT NULL,
  source TEXT NOT NULL DEFAULT 'camera',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scans_user_idx ON public.scans (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scans own" ON public.scans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.aura_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  public_id TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8),'hex'),
  mode public.scan_mode NOT NULL,
  score INTEGER NOT NULL,
  aura_type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  percentile NUMERIC(5,2) NOT NULL,
  headline TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX aura_cards_user_idx ON public.aura_cards (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aura_cards TO authenticated;
GRANT SELECT ON public.aura_cards TO anon;
GRANT ALL ON public.aura_cards TO service_role;
ALTER TABLE public.aura_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aura public read" ON public.aura_cards FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "aura write own" ON public.aura_cards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "aura update own" ON public.aura_cards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "aura delete own" ON public.aura_cards FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- secrets ----------------
CREATE TABLE public.secret_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  moderation_state TEXT NOT NULL DEFAULT 'clean',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX secret_messages_recipient_idx ON public.secret_messages (recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_messages TO authenticated;
GRANT ALL ON public.secret_messages TO service_role;
ALTER TABLE public.secret_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secrets recipient read" ON public.secret_messages FOR SELECT TO authenticated USING (recipient_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "secrets send" ON public.secret_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND recipient_id <> auth.uid());
CREATE POLICY "secrets recipient update" ON public.secret_messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "secrets recipient delete" ON public.secret_messages FOR DELETE TO authenticated USING (recipient_id = auth.uid());

CREATE TABLE public.secret_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.secret_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_replies TO authenticated;
GRANT ALL ON public.secret_replies TO service_role;
ALTER TABLE public.secret_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secret replies read" ON public.secret_replies FOR SELECT TO authenticated USING (
  author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.secret_messages m WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
);
CREATE POLICY "secret replies write" ON public.secret_replies FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- ---------------- crush matcher (double blind) ----------------
CREATE TABLE public.crush_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crush_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, crush_id)
);
GRANT SELECT, INSERT, DELETE ON public.crush_selections TO authenticated;
GRANT ALL ON public.crush_selections TO service_role;
ALTER TABLE public.crush_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crush own only" ON public.crush_selections FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "crush insert own" ON public.crush_selections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND crush_id <> auth.uid());
CREATE POLICY "crush delete own" ON public.crush_selections FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- reels ----------------
CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  audio_label TEXT,
  category TEXT NOT NULL DEFAULT 'for-you',
  duration_seconds NUMERIC(6,2),
  views_count BIGINT NOT NULL DEFAULT 0,
  watch_seconds BIGINT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  moderation_state TEXT NOT NULL DEFAULT 'clean',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reels_feed_idx ON public.reels (category, created_at DESC) WHERE is_published;
CREATE INDEX reels_creator_idx ON public.reels (creator_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT SELECT ON public.reels TO anon;
GRANT ALL ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels public read" ON public.reels FOR SELECT USING ((is_published = true AND moderation_state <> 'removed') OR creator_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "reels insert own" ON public.reels FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "reels update own" ON public.reels FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (true);
CREATE POLICY "reels delete own" ON public.reels FOR DELETE TO authenticated USING (creator_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER reels_updated BEFORE UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reel_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction public.reaction_key NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reel_id, user_id)
);
CREATE INDEX reel_reactions_reel_idx ON public.reel_reactions (reel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_reactions TO authenticated;
GRANT SELECT ON public.reel_reactions TO anon;
GRANT ALL ON public.reel_reactions TO service_role;
ALTER TABLE public.reel_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel reactions read" ON public.reel_reactions FOR SELECT USING (true);
CREATE POLICY "reel reactions own write" ON public.reel_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reel reactions own update" ON public.reel_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reel reactions own delete" ON public.reel_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- vibe feed ----------------
CREATE TABLE public.vibe_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  image_url TEXT,
  moderation_state TEXT NOT NULL DEFAULT 'clean',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vibe_feed_created_idx ON public.vibe_feed (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vibe_feed TO authenticated;
GRANT SELECT ON public.vibe_feed TO anon;
GRANT ALL ON public.vibe_feed TO service_role;
ALTER TABLE public.vibe_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vibe feed read" ON public.vibe_feed FOR SELECT USING (moderation_state <> 'removed' OR author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "vibe feed insert own" ON public.vibe_feed FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "vibe feed update own" ON public.vibe_feed FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (true);
CREATE POLICY "vibe feed delete own" ON public.vibe_feed FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.vibe_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction public.reaction_key NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX feed_reactions_post_idx ON public.feed_reactions (post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_reactions TO authenticated;
GRANT SELECT ON public.feed_reactions TO anon;
GRANT ALL ON public.feed_reactions TO service_role;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed reactions read" ON public.feed_reactions FOR SELECT USING (true);
CREATE POLICY "feed reactions own write" ON public.feed_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed reactions own update" ON public.feed_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed reactions own delete" ON public.feed_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- social graph ----------------
CREATE TABLE public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
CREATE INDEX social_following_idx ON public.social_connections (following_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_connections TO authenticated;
GRANT SELECT ON public.social_connections TO anon;
GRANT ALL ON public.social_connections TO service_role;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social read" ON public.social_connections FOR SELECT USING (true);
CREATE POLICY "social insert own" ON public.social_connections FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid() AND following_id <> auth.uid());
CREATE POLICY "social delete own" ON public.social_connections FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- ---------------- blocks / mutes / restricts ----------------
CREATE TABLE public.user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('block','mute','restrict')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_id, kind)
);
GRANT SELECT, INSERT, DELETE ON public.user_restrictions TO authenticated;
GRANT ALL ON public.user_restrictions TO service_role;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restrictions own" ON public.user_restrictions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "restrictions insert own" ON public.user_restrictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "restrictions delete own" ON public.user_restrictions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- chats + calls ----------------
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'direct',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);
CREATE TABLE public.chat_participants (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_participants TO authenticated;
GRANT ALL ON public.chats, public.chat_participants TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_chat_member(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = _chat_id AND user_id = _user_id);
$$;
CREATE POLICY "chats member read" ON public.chats FOR SELECT TO authenticated USING (public.is_chat_member(id, auth.uid()));
CREATE POLICY "chats create" ON public.chats FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "chats member update" ON public.chats FOR UPDATE TO authenticated USING (public.is_chat_member(id, auth.uid())) WITH CHECK (true);
CREATE POLICY "participants read" ON public.chat_participants FOR SELECT TO authenticated USING (public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "participants add" ON public.chat_participants FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.created_by = auth.uid())
);
CREATE POLICY "participants leave" ON public.chat_participants FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  media_url TEXT,
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  reaction public.reaction_key,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_chat_idx ON public.chat_messages (chat_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages member read" ON public.chat_messages FOR SELECT TO authenticated USING (public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "messages send" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_chat_member(chat_id, auth.uid()));
CREATE POLICY "messages update own" ON public.chat_messages FOR UPDATE TO authenticated USING (sender_id = auth.uid() OR public.is_chat_member(chat_id, auth.uid())) WITH CHECK (true);
CREATE POLICY "messages delete own" ON public.chat_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('audio','video')),
  state TEXT NOT NULL DEFAULT 'ringing',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT ALL ON public.calls TO service_role;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls participants read" ON public.calls FOR SELECT TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE POLICY "calls start" ON public.calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid());
CREATE POLICY "calls participants update" ON public.calls FOR UPDATE TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid()) WITH CHECK (true);

-- ---------------- notifications ----------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications own delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------- new user bootstrap ----------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_name TEXT; final_name TEXT; n INT := 0;
BEGIN
  base_name := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(coalesce(NEW.email,'vyzuner'),'@',1)), '[^a-z0-9_]', '', 'g'));
  IF base_name = '' OR base_name IS NULL THEN base_name := 'vyzuner'; END IF;
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    n := n + 1; final_name := base_name || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_name, coalesce(NEW.raw_user_meta_data->>'display_name', final_name));
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ===== supabase/migrations/20260901103354_98df515a-fb0a-4e98-ae9a-bad3dd003af9.sql =====
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
-- ===== supabase/migrations/20260901103602_68fbd8ca-5ccf-4f6a-8ac7-c1129623b7d0.sql =====
-- ============ VYZUN creator economy / payments / admin ============
-- Real money only. No virtual currency, no leaderboards.

CREATE TYPE public.earning_state AS ENUM ('pending','available','paid','failed','reversed');
CREATE TYPE public.earning_source AS ENUM ('reel_revenue_share','brand_mission','affiliate','fan_subscription','paid_interaction','challenge','sponsored');
CREATE TYPE public.payout_state AS ENUM ('requested','processing','paid','failed','cancelled');

-- ---------------- creator profiles ----------------
CREATE TABLE public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_monetization_enabled BOOLEAN NOT NULL DEFAULT false,
  eligibility_state TEXT NOT NULL DEFAULT 'not_applied',
  payout_country TEXT,
  payout_currency TEXT,
  payout_method_state TEXT NOT NULL DEFAULT 'not_configured',
  tax_status TEXT NOT NULL DEFAULT 'not_provided',
  fraud_state TEXT NOT NULL DEFAULT 'clear',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator profile own" ON public.creator_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "creator profile insert own" ON public.creator_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "creator profile update own" ON public.creator_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER creator_profiles_updated BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- real-money ledger ----------------
CREATE TABLE public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.earning_source NOT NULL,
  reference_id UUID,
  gross_amount NUMERIC(14,2) NOT NULL,
  platform_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  state public.earning_state NOT NULL DEFAULT 'pending',
  external_transaction_id TEXT,
  available_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX creator_earnings_user_idx ON public.creator_earnings (user_id, created_at DESC);
CREATE INDEX creator_earnings_state_idx ON public.creator_earnings (user_id, state);
GRANT SELECT ON public.creator_earnings TO authenticated;
GRANT ALL ON public.creator_earnings TO service_role;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "earnings own read" ON public.creator_earnings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER creator_earnings_updated BEFORE UPDATE ON public.creator_earnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT,
  provider_reference TEXT,
  state public.payout_state NOT NULL DEFAULT 'requested',
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX creator_payouts_user_idx ON public.creator_payouts (user_id, requested_at DESC);
GRANT SELECT ON public.creator_payouts TO authenticated;
GRANT ALL ON public.creator_payouts TO service_role;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts own read" ON public.creator_payouts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER creator_payouts_updated BEFORE UPDATE ON public.creator_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- subscriptions + payments ----------------
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('prime','prime_creator')),
  period TEXT NOT NULL CHECK (period IN ('monthly','yearly')),
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'inactive',
  provider TEXT,
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_idx ON public.subscriptions (user_id, state);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions own read" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_user_idx ON public.payments (user_id, created_at DESC);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.fan_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'inactive',
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fan_id, creator_id)
);
GRANT SELECT ON public.fan_subscriptions TO authenticated;
GRANT ALL ON public.fan_subscriptions TO service_role;
ALTER TABLE public.fan_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fan subs visible to parties" ON public.fan_subscriptions FOR SELECT TO authenticated USING (fan_id = auth.uid() OR creator_id = auth.uid());
CREATE TRIGGER fan_subscriptions_updated BEFORE UPDATE ON public.fan_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.creator_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_tiers TO authenticated;
GRANT SELECT ON public.creator_tiers TO anon;
GRANT ALL ON public.creator_tiers TO service_role;
ALTER TABLE public.creator_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers public read" ON public.creator_tiers FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "tiers own write" ON public.creator_tiers FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "tiers own update" ON public.creator_tiers FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "tiers own delete" ON public.creator_tiers FOR DELETE TO authenticated USING (creator_id = auth.uid());

-- ---------------- paid interactions ----------------
CREATE TABLE public.paid_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('audio_session','video_session','live_experience','exclusive_content')),
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  state TEXT NOT NULL DEFAULT 'listed',
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.paid_interactions TO authenticated;
GRANT ALL ON public.paid_interactions TO service_role;
ALTER TABLE public.paid_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paid interactions read" ON public.paid_interactions FOR SELECT TO authenticated USING (creator_id = auth.uid() OR buyer_id = auth.uid() OR state = 'listed');
CREATE POLICY "paid interactions creator write" ON public.paid_interactions FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "paid interactions creator update" ON public.paid_interactions FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- ---------------- brand marketplace ----------------
CREATE TABLE public.brand_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  title TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  budget_total NUMERIC(14,2) NOT NULL,
  payout_per_creator NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL,
  countries TEXT[] NOT NULL DEFAULT '{}',
  deadline TIMESTAMPTZ,
  state TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_campaigns_state_idx ON public.brand_campaigns (state, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_campaigns TO authenticated;
GRANT ALL ON public.brand_campaigns TO service_role;
ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns read" ON public.brand_campaigns FOR SELECT TO authenticated USING (state = 'active' OR brand_owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "campaigns own write" ON public.brand_campaigns FOR INSERT TO authenticated WITH CHECK (brand_owner_id = auth.uid());
CREATE POLICY "campaigns own update" ON public.brand_campaigns FOR UPDATE TO authenticated USING (brand_owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY "campaigns own delete" ON public.brand_campaigns FOR DELETE TO authenticated USING (brand_owner_id = auth.uid());
CREATE TRIGGER brand_campaigns_updated BEFORE UPDATE ON public.brand_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL DEFAULT '',
  submission_url TEXT,
  submission_reel_id UUID REFERENCES public.reels(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'applied',
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE ON public.campaign_applications TO authenticated;
GRANT ALL ON public.campaign_applications TO service_role;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications read" ON public.campaign_applications FOR SELECT TO authenticated USING (
  creator_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.brand_campaigns c WHERE c.id = campaign_id AND c.brand_owner_id = auth.uid())
  OR public.is_staff(auth.uid())
);
CREATE POLICY "applications creator write" ON public.campaign_applications FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "applications update" ON public.campaign_applications FOR UPDATE TO authenticated USING (
  creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.brand_campaigns c WHERE c.id = campaign_id AND c.brand_owner_id = auth.uid())
) WITH CHECK (true);
CREATE TRIGGER campaign_applications_updated BEFORE UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- affiliate ----------------
CREATE TABLE public.affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  product_url TEXT NOT NULL,
  image_url TEXT,
  merchant TEXT,
  commission_rate NUMERIC(5,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  clicks_count BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;
GRANT SELECT ON public.affiliate_products TO anon;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate public read" ON public.affiliate_products FOR SELECT USING (is_active = true OR creator_id = auth.uid());
CREATE POLICY "affiliate own write" ON public.affiliate_products FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "affiliate own update" ON public.affiliate_products FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "affiliate own delete" ON public.affiliate_products FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_reference TEXT,
  order_amount NUMERIC(14,2),
  commission_amount NUMERIC(14,2),
  currency TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_conversions_creator_idx ON public.affiliate_conversions (creator_id, created_at DESC);
GRANT SELECT ON public.affiliate_conversions TO authenticated;
GRANT ALL ON public.affiliate_conversions TO service_role;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate conversions own read" ON public.affiliate_conversions FOR SELECT TO authenticated USING (creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ---------------- challenges ----------------
CREATE TABLE public.creator_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '',
  prize_pool NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  is_funded BOOLEAN NOT NULL DEFAULT false,
  deadline TIMESTAMPTZ,
  state TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creator_challenges TO authenticated;
GRANT SELECT ON public.creator_challenges TO anon;
GRANT ALL ON public.creator_challenges TO service_role;
ALTER TABLE public.creator_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges read" ON public.creator_challenges FOR SELECT USING (state IN ('active','closed') OR created_by = auth.uid());
CREATE POLICY "challenges own write" ON public.creator_challenges FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "challenges own update" ON public.creator_challenges FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.creator_challenges(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES public.reels(id) ON DELETE SET NULL,
  notes TEXT,
  state TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, creator_id)
);
GRANT SELECT, INSERT, UPDATE ON public.challenge_submissions TO authenticated;
GRANT ALL ON public.challenge_submissions TO service_role;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions read" ON public.challenge_submissions FOR SELECT TO authenticated USING (
  creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.creator_challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid()) OR public.is_staff(auth.uid())
);
CREATE POLICY "submissions own write" ON public.challenge_submissions FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "submissions own update" ON public.challenge_submissions FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- ---------------- sponsored content ----------------
CREATE TABLE public.sponsored_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
  reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
  advertiser_name TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Sponsored',
  target_countries TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsored_content TO authenticated, anon;
GRANT ALL ON public.sponsored_content TO service_role;
ALTER TABLE public.sponsored_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsored read active" ON public.sponsored_content FOR SELECT USING (is_active = true);

-- ---------------- verification (separate from Prime) ----------------
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT,
  document_kind TEXT,
  document_url TEXT,
  state TEXT NOT NULL DEFAULT 'submitted',
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification own read" ON public.verification_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "verification own write" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER verification_requests_updated BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- moderation ----------------
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_kind TEXT NOT NULL,
  target_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  state TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_state_idx ON public.reports (state, created_at DESC);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports own read" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "reports create" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation read" ON public.moderation_actions FOR SELECT TO authenticated USING (affected_user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES public.moderation_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appeals own read" ON public.appeals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "appeals own write" ON public.appeals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------------- global config ----------------
CREATE TABLE public.country_config (
  country_code TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  currencies TEXT[] NOT NULL DEFAULT ARRAY['USD'],
  default_currency TEXT NOT NULL DEFAULT 'USD',
  payment_providers TEXT[] NOT NULL DEFAULT '{}',
  payout_providers TEXT[] NOT NULL DEFAULT '{}',
  tax_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  min_age SMALLINT NOT NULL DEFAULT 13,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.country_config TO authenticated, anon;
GRANT ALL ON public.country_config TO service_role;
ALTER TABLE public.country_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "country config read" ON public.country_config FOR SELECT USING (true);
CREATE POLICY "country config admin write" ON public.country_config FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage SMALLINT NOT NULL DEFAULT 0,
  countries TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags admin write" ON public.feature_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.country_config (country_code, supported_languages, currencies, default_currency, payment_providers, payout_providers, tax_rules)
VALUES
  ('IN', ARRAY['en','hi','bn','ta','te','mr'], ARRAY['INR'], 'INR', '{}', '{}', '{"gst":"configurable"}'),
  ('US', ARRAY['en','es'], ARRAY['USD'], 'USD', '{}', '{}', '{"1099":"configurable"}'),
  ('GB', ARRAY['en'], ARRAY['GBP'], 'GBP', '{}', '{}', '{}'),
  ('AE', ARRAY['en','ar'], ARRAY['AED'], 'AED', '{}', '{}', '{}'),
  ('DE', ARRAY['de','en'], ARRAY['EUR'], 'EUR', '{}', '{}', '{"vat":"configurable"}');

INSERT INTO public.feature_flags (key, description, is_enabled, rollout_percentage) VALUES
  ('reels_upload','Creator reel uploads', false, 0),
  ('monetization','Real-money creator monetization', false, 0),
  ('payments','Server-verified payment checkout', false, 0),
  ('brand_marketplace','Brand missions marketplace', false, 0),
  ('calls','Audio and video calls', false, 0),
  ('ai_aura','AI-powered aura readings', true, 100);
