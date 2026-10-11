-- Seed data for local/dev. Realistic but synthetic — no real people, no real
-- market data. Run after the 0001_init migration: `supabase db reset` picks
-- this up, or `psql < supabase/seed.sql`.

insert into instruments (symbol, name, sector) values
  ('SBIN', 'State Bank of India', 'PSU Bank'),
  ('AXISBANK', 'Axis Bank', 'Private Bank'),
  ('HDFCBANK', 'HDFC Bank', 'Private Bank'),
  ('TITAN', 'Titan Company', 'Consumer'),
  ('INFY', 'Infosys', 'IT'),
  ('WIPRO', 'Wipro', 'IT'),
  ('HCLTECH', 'HCL Technologies', 'IT'),
  ('RELIANCE', 'Reliance Industries', 'Energy'),
  ('TATAMOTORS', 'Tata Motors', 'Auto'),
  ('MARUTI', 'Maruti Suzuki', 'Auto'),
  ('SUNPHARMA', 'Sun Pharma', 'Pharma'),
  ('CIPLA', 'Cipla', 'Pharma'),
  ('ADANIENT', 'Adani Enterprises', 'Infra'),
  ('ITC', 'ITC', 'FMCG'),
  ('TATASTEEL', 'Tata Steel', 'Metal'),
  ('ONGC', 'ONGC', 'Energy')
on conflict (symbol) do nothing;

insert into trading_calendar (trade_date, is_open, session_type)
values (current_date, true, 'normal')
on conflict (trade_date) do nothing;

insert into courses (title, slug) values
  ('The Trader''s Journey (demo)', 'traders-journey')
on conflict (slug) do nothing;

-- Note: stock_snapshots / sector_snapshots / option_sentiment are written by the
-- market-data worker against the licensed feed (not seeded here). Until that
-- worker exists the app's board falls back to the synthetic lib/fakeData layer.
