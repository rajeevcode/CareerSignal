-- Site policy pages (Terms / Privacy / Copyright & DMCA) — editable content
-- surfaced on the public marketing routes. Ported from the talent-signal-labs
-- (Lovable) design. Publicly readable; admin-writable via the app's is_admin().

CREATE TABLE IF NOT EXISTS public.site_policies (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.site_policies TO anon, authenticated;
GRANT UPDATE, INSERT ON public.site_policies TO authenticated;
GRANT ALL ON public.site_policies TO service_role;

ALTER TABLE public.site_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_site_policies_public_read ON public.site_policies;
CREATE POLICY p_site_policies_public_read
  ON public.site_policies FOR SELECT
  USING (true);

DROP POLICY IF EXISTS p_site_policies_admin_insert ON public.site_policies;
CREATE POLICY p_site_policies_admin_insert
  ON public.site_policies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_site_policies_admin_update ON public.site_policies;
CREATE POLICY p_site_policies_admin_update
  ON public.site_policies FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_site_policies_updated_at ON public.site_policies;
CREATE TRIGGER trg_site_policies_updated_at
  BEFORE UPDATE ON public.site_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.site_policies (slug, title, body) VALUES
  ('copyright', 'Copyright & DMCA Policy',
'## Ownership

© CareerSignal. All rights reserved. The CareerSignal name, logo, visual design, user interface, layouts, illustrations, copy, product screenshots, and underlying source code are owned by CareerSignal or its licensors and are protected by copyright, trademark, and other intellectual property laws.

## Permitted use

- You may access and use CareerSignal solely through the official product as offered to you, subject to our Terms of Service.
- You may reference our name or link to public pages for fair, non-misleading editorial or review purposes.
- Content you create with CareerSignal (e.g. your CV, notes, exports) remains yours. Our templates, prompts, scoring logic, and UI remain ours.

## Restrictions

Without prior written permission, you may not:

- Copy, clone, mirror, or rehost the CareerSignal interface, design system, layouts, or marketing pages, in whole or in part.
- Reverse engineer, decompile, scrape at scale, or extract source code, prompts, scoring rubrics, or model outputs to build a competing product.
- Use the CareerSignal name, logo, or screenshots in a way that implies endorsement, partnership, or certification that does not exist.
- Remove or alter copyright, trademark, or attribution notices that appear in the product or its assets.

## Respecting others'' rights

CareerSignal respects the intellectual property of others and expects users to do the same. Do not upload, generate, or share content through CareerSignal that infringes a third party''s copyright, trademark, or other rights.'),
  ('terms', 'Terms of Service',
'## Agreement

By accessing or using CareerSignal you agree to these Terms of Service. If you do not agree, do not use the service.

## Your account

You are responsible for the activity that happens under your account and for keeping your credentials secure. Notify us promptly of any unauthorized use.

## Acceptable use

You agree not to misuse CareerSignal, including by:

- Uploading unlawful, infringing, or harmful content.
- Attempting to disrupt the service, bypass access controls, or scrape data at scale.
- Using the service to harass, defame, or violate the rights of others.

## Content

You retain ownership of the content you provide. You grant CareerSignal a limited license to process that content solely to operate and improve the service for you.

## Subscriptions and billing

Paid plans renew on the cycle disclosed at purchase. You can cancel any time; cancellations take effect at the end of the current period.

## Termination

We may suspend or terminate access for violations of these terms or for risk to the service or its users.

## Disclaimer

CareerSignal is provided "as is" without warranties. To the maximum extent permitted by law we disclaim implied warranties and limit our liability.

## Changes

We may update these terms. Material changes will be reflected on this page with a new "Last updated" date.

## Contact

Questions about these terms? Email support@careersignal.app.'),
  ('privacy', 'Privacy Policy',
'## Overview

This Privacy Policy describes what information CareerSignal collects, how we use it, and the choices you have.

## Information we collect

- **Account information** you provide when you sign up, such as name, email, and password.
- **Content** you upload or generate, such as CVs, job descriptions, and notes.
- **Usage data** such as pages visited, features used, and device and browser information.

## How we use information

- To provide, maintain, and improve CareerSignal.
- To personalize features such as CV scoring and job matching.
- To communicate service updates, security alerts, and support messages.
- To detect, prevent, and respond to fraud or abuse.

## Sharing

We do not sell your personal information. We share data with service providers that help us operate the product (hosting, analytics, email) under appropriate contractual safeguards, and when required by law.

## Data retention

We retain account and content data while your account is active. You can delete your account at any time from the Account page; backups are purged on our standard cycle.

## Your choices

You can access, correct, export, or delete your information from the Account page or by contacting us.

## Security

We use industry-standard safeguards to protect your information. No system is perfectly secure; please use strong, unique passwords.

## Contact

Questions about privacy? Email privacy@careersignal.app.')
ON CONFLICT (slug) DO NOTHING;
