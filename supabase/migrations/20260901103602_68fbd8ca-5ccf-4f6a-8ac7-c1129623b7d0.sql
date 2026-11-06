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