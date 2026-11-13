-- Core seed. Real facts and reference data only. Nothing here is invented:
-- any future demo content must set is_sample = true and say "Sample" on screen.
-- Everything below is editable from admin after launch.

-- Countries (expand from admin as ACL grows across the continent).
insert into public.countries (code, name, flag_emoji) values
  ('NG', 'Nigeria', '🇳🇬'),
  ('GH', 'Ghana', '🇬🇭'),
  ('KE', 'Kenya', '🇰🇪'),
  ('ZA', 'South Africa', '🇿🇦'),
  ('CM', 'Cameroon', '🇨🇲'),
  ('SN', 'Senegal', '🇸🇳'),
  ('NE', 'Niger', '🇳🇪'),
  ('BJ', 'Benin', '🇧🇯'),
  ('TG', 'Togo', '🇹🇬'),
  ('CI', 'Côte d''Ivoire', '🇨🇮'),
  ('UG', 'Uganda', '🇺🇬'),
  ('TZ', 'Tanzania', '🇹🇿')
on conflict (code) do nothing;

-- The 36 states of Nigeria plus the FCT.
insert into public.states (country_code, name, slug, code, capital) values
  ('NG', 'Abia', 'abia', 'AB', 'Umuahia'),
  ('NG', 'Adamawa', 'adamawa', 'AD', 'Yola'),
  ('NG', 'Akwa Ibom', 'akwa-ibom', 'AK', 'Uyo'),
  ('NG', 'Anambra', 'anambra', 'AN', 'Awka'),
  ('NG', 'Bauchi', 'bauchi', 'BA', 'Bauchi'),
  ('NG', 'Bayelsa', 'bayelsa', 'BY', 'Yenagoa'),
  ('NG', 'Benue', 'benue', 'BE', 'Makurdi'),
  ('NG', 'Borno', 'borno', 'BO', 'Maiduguri'),
  ('NG', 'Cross River', 'cross-river', 'CR', 'Calabar'),
  ('NG', 'Delta', 'delta', 'DE', 'Asaba'),
  ('NG', 'Ebonyi', 'ebonyi', 'EB', 'Abakaliki'),
  ('NG', 'Edo', 'edo', 'ED', 'Benin City'),
  ('NG', 'Ekiti', 'ekiti', 'EK', 'Ado-Ekiti'),
  ('NG', 'Enugu', 'enugu', 'EN', 'Enugu'),
  ('NG', 'Gombe', 'gombe', 'GO', 'Gombe'),
  ('NG', 'Imo', 'imo', 'IM', 'Owerri'),
  ('NG', 'Jigawa', 'jigawa', 'JI', 'Dutse'),
  ('NG', 'Kaduna', 'kaduna', 'KD', 'Kaduna'),
  ('NG', 'Kano', 'kano', 'KN', 'Kano'),
  ('NG', 'Katsina', 'katsina', 'KT', 'Katsina'),
  ('NG', 'Kebbi', 'kebbi', 'KE', 'Birnin Kebbi'),
  ('NG', 'Kogi', 'kogi', 'KO', 'Lokoja'),
  ('NG', 'Kwara', 'kwara', 'KW', 'Ilorin'),
  ('NG', 'Lagos', 'lagos', 'LA', 'Ikeja'),
  ('NG', 'Nasarawa', 'nasarawa', 'NA', 'Lafia'),
  ('NG', 'Niger', 'niger', 'NI', 'Minna'),
  ('NG', 'Ogun', 'ogun', 'OG', 'Abeokuta'),
  ('NG', 'Ondo', 'ondo', 'ON', 'Akure'),
  ('NG', 'Osun', 'osun', 'OS', 'Osogbo'),
  ('NG', 'Oyo', 'oyo', 'OY', 'Ibadan'),
  ('NG', 'Plateau', 'plateau', 'PL', 'Jos'),
  ('NG', 'Rivers', 'rivers', 'RI', 'Port Harcourt'),
  ('NG', 'Sokoto', 'sokoto', 'SO', 'Sokoto'),
  ('NG', 'Taraba', 'taraba', 'TA', 'Jalingo'),
  ('NG', 'Yobe', 'yobe', 'YO', 'Damaturu'),
  ('NG', 'Zamfara', 'zamfara', 'ZA', 'Gusau'),
  ('NG', 'Federal Capital Territory', 'fct', 'FC', 'Abuja')
on conflict (slug) do nothing;

-- Sports. Boxing is live. The rest are ready to be switched on from admin.
insert into public.sports (key, name, description, is_active, sort_order, rules) values
  ('boxing', 'Boxing', 'ACL''s founding discipline.', true, 10,
   '{"round_minutes": 3, "rest_seconds": 60, "scoring": "10-point must", "result_methods": ["KO", "TKO", "UD", "SD", "MD", "RTD", "DQ", "Draw", "NC"]}'),
  ('mma', 'Mixed Martial Arts', null, false, 20, '{}'),
  ('kickboxing', 'Kickboxing', null, false, 30, '{}'),
  ('dambe', 'Dambe', 'Traditional Hausa boxing.', false, 40, '{}'),
  ('laamb', 'Laamb', 'Traditional Senegalese wrestling.', false, 50, '{}')
on conflict (key) do nothing;

-- Standard boxing divisions (limits in kg).
insert into public.weight_classes (sport_id, name, slug, gender, min_weight_kg, max_weight_kg, sort_order)
select s.id, w.name, w.slug, 'men', w.min_kg, w.max_kg, w.sort_order
from public.sports s,
(values
  ('Heavyweight',        'heavyweight',        90.72, null,  10),
  ('Cruiserweight',      'cruiserweight',      79.38, 90.72, 20),
  ('Light Heavyweight',  'light-heavyweight',  76.20, 79.38, 30),
  ('Super Middleweight', 'super-middleweight', 72.57, 76.20, 40),
  ('Middleweight',       'middleweight',       69.85, 72.57, 50),
  ('Super Welterweight', 'super-welterweight', 66.68, 69.85, 60),
  ('Welterweight',       'welterweight',       63.50, 66.68, 70),
  ('Super Lightweight',  'super-lightweight',  61.23, 63.50, 80),
  ('Lightweight',        'lightweight',        58.97, 61.23, 90),
  ('Super Featherweight','super-featherweight',57.15, 58.97, 100),
  ('Featherweight',      'featherweight',      55.34, 57.15, 110),
  ('Super Bantamweight', 'super-bantamweight', 53.52, 55.34, 120),
  ('Bantamweight',       'bantamweight',       52.16, 53.52, 130),
  ('Super Flyweight',    'super-flyweight',    50.80, 52.16, 140),
  ('Flyweight',          'flyweight',          48.99, 50.80, 150),
  ('Light Flyweight',    'light-flyweight',    47.63, 48.99, 160),
  ('Minimumweight',      'minimumweight',      null,  47.63, 170)
) as w (name, slug, min_kg, max_kg, sort_order)
where s.key = 'boxing'
on conflict (sport_id, gender, slug) do nothing;

-- Series.
insert into public.series (slug, name, tagline, sort_order) values
  ('acl-numbered', 'ACL Numbered Events', null, 10),
  ('state-wars', 'State Wars', 'State vs State.', 20),
  ('lions-den-fight-night', 'Lion''s Den Fight Night', null, 30)   -- real series, no events yet
on conflict (slug) do nothing;

-- The three real records.
-- 1. ACL 001. Completed. Exact date and venue are filled in from admin.
insert into public.events (series_id, title, subtitle, slug, city, state_id, country_code, status, attendance)
select se.id, 'ACL 001', 'Rise of the Lion: The Reckoning', 'acl-001-rise-of-the-lion-the-reckoning',
       'Item', st.id, 'NG', 'completed', 10000
from public.series se, public.states st
where se.slug = 'acl-numbered' and st.slug = 'abia'
on conflict (slug) do nothing;

-- 2. State Wars: Imo vs Abia, Governors' Cup. Postponed. Date TBA (starts_at is null).
insert into public.events (series_id, title, subtitle, slug, country_code, status)
select se.id, 'State Wars: Imo vs Abia', 'Governors'' Cup', 'state-wars-imo-vs-abia-governors-cup', 'NG', 'postponed'
from public.series se
where se.slug = 'state-wars'
on conflict (slug) do nothing;

-- 3. Lion's Den Fight Night is the empty series inserted above.

-- Settings: the editable source of truth for brand facts.
insert into public.settings (key, value, description) values
  ('brand.name',        '"Africa Combat League"', 'Full name. Always "Africa", never "African".'),
  ('brand.short_name',  '"ACL"', 'Short name.'),
  ('brand.tagline',     '"Unchained. Unbreakable."', 'Tagline.'),
  ('brand.philosophy',  '"Built by fighters for fighters."', 'Philosophy line.'),
  ('brand.story_title', '"The End of the Talent Farm."', 'Core story headline.'),
  ('brand.story_body',  '"Africa''s fighters. Africa''s fame. Africa''s money. They stay here."', 'Core story, one breath.'),
  ('brand.origin_symbol', '"The bamboo-stick ring. Where it started. We never hide it."', 'Origin motif caption.'),
  ('founder.name',      '"Clinton Edward"', 'Founder, CEO and Chairman.'),
  ('founder.title',     '"Founder, CEO and Chairman"', 'Founder title.'),
  ('founder.footer_line', '"Founded by Clinton Edward"', 'Shown in the footer of every page.'),
  ('founder.photo_url', 'null', 'Founder photo used on posters and share cards. Upload to the media bucket.'),
  ('hq.city',           '"Aba"', 'Headquarters city.'),
  ('hq.state',          '"Abia State"', 'Headquarters state.'),
  ('hq.country',        '"Nigeria"', 'Headquarters country.'),
  ('contact.phone',     '"09074008447"', 'Public contact phone.'),
  ('contact.whatsapp',  '"2349074008447"', 'WhatsApp click-to-chat number, international format, digits only.'),
  ('contact.email',     '"Africacombatleague@gmail.com"', 'Public contact email.'),
  ('site.domain',       '"africacombatleague.com"', 'Primary domain.'),
  ('facts.acl_001',     '{"name": "ACL 001", "title": "Rise of the Lion: The Reckoning", "town": "Item", "state": "Abia State", "attendance_approx": 10000, "paid_advertising": "zero"}',
                        'The first ACL event. About 10,000 people. Zero paid advertising.'),
  ('social.links',      '{"instagram": null, "tiktok": null, "facebook": null, "youtube": null, "x": null}', 'Official social profiles.'),
  ('currency.default',  '"NGN"', 'Default currency.'),
  ('currency.supported','["NGN", "USD", "GHS", "KES", "ZAR"]', 'Currencies the site can display and charge.'),
  ('i18n.default_locale', '"en"', 'Default language.'),
  ('i18n.enabled_locales', '["en"]', 'Languages live on the site. Planned: fr, pcm, ha, ig, yo, sw.'),
  ('compliance.min_age', '18', 'Minimum age for predictions and anything involving money.')
on conflict (key) do nothing;
