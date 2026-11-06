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