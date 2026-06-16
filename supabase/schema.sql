-- ============================================================
-- CY Admin Panel — Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── TEAMS ────────────────────────────────────────────────────
create table if not exists teams (
  id         uuid primary key default gen_random_uuid(),
  name       varchar(100) not null unique,
  colour     varchar(20) default '#6366f1',
  created_at timestamp default now()
);

-- Seed the 9 teams
insert into teams (name, colour) values
  ('Prayer Service', '#8b5cf6'),
  ('Alter Service',  '#6366f1'),
  ('Choir',          '#ec4899'),
  ('Art',            '#f59e0b'),
  ('Social Ministry','#10b981'),
  ('Dance',          '#f97316'),
  ('Media',          '#3b82f6'),
  ('Sports',         '#14b8a6'),
  ('Documentation',  '#a855f7')
on conflict (name) do nothing;

-- ── ADMINS (members with admin access) ───────────────────────
create table if not exists admins (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(200) not null,
  phone       varchar(20) not null unique,
  email       varchar(200),
  role        varchar(50) not null default 'Member'
                check (role in ('Super Admin','President','Secretary','Media Admin','Team Leader','Member','Alumni')),
  team_id     uuid references teams(id) on delete set null,
  photo_url   text,
  dob         date,
  is_active   boolean default true,
  is_alumni   boolean default false,
  joined_at   timestamp default now(),
  created_at  timestamp default now()
);

-- ── OTP SESSIONS ─────────────────────────────────────────────
create table if not exists otp_sessions (
  phone      varchar(20) primary key,
  otp_code   varchar(10) not null,
  expires_at timestamp not null,
  created_at timestamp default now()
);

-- ── EVENTS ───────────────────────────────────────────────────
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  title        varchar(200) not null,
  description  text,
  event_date   timestamp not null,
  location     varchar(300),
  type         varchar(50) default 'Church Event'
                 check (type in ('Church Event','Birthday','Feast Day','Meeting','Special Event','Team Event')),
  banner_url   text,
  team_id      uuid references teams(id) on delete set null,
  is_recurring boolean default false,
  created_by   uuid references admins(id) on delete set null,
  created_at   timestamp default now()
);

-- ── MEDIA ────────────────────────────────────────────────────
create table if not exists media (
  id           uuid primary key default gen_random_uuid(),
  file_url     text not null,
  thumb_url    text,
  album_name   varchar(200),
  event_id     uuid references events(id) on delete set null,
  uploaded_by  uuid references admins(id) on delete set null,
  file_size    bigint,
  created_at   timestamp default now()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  title        varchar(200) not null,
  body         text not null,
  type         varchar(20) default 'info'
                 check (type in ('info','important','emergency')),
  target_type  varchar(20) default 'all'
                 check (target_type in ('all','team','individual')),
  target_id    uuid,
  scheduled_at timestamp,
  sent_at      timestamp,
  created_by   uuid references admins(id) on delete set null,
  created_at   timestamp default now()
);

-- ── PRAYER SCHEDULES ─────────────────────────────────────────
create table if not exists prayer_schedules (
  id           uuid primary key default gen_random_uuid(),
  member_name  varchar(200) not null,
  member_id    uuid references admins(id) on delete set null,
  team_id      uuid references teams(id) on delete set null,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  slot_time    time not null,
  week_start   date not null,
  created_at   timestamp default now(),
  unique (day_of_week, slot_time, week_start)
);

-- ── BIBLE QUOTES ──────────────────────────────────────────────
create table if not exists bible_quotes (
  id             uuid primary key default gen_random_uuid(),
  verse_text     text not null,
  reference      varchar(100) not null,
  scheduled_date date,
  used           boolean default false,
  created_at     timestamp default now()
);

-- Seed a few Bible verses
insert into bible_quotes (verse_text, reference) values
  ('For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', 'Jeremiah 29:11'),
  ('I can do all this through him who gives me strength.', 'Philippians 4:13'),
  ('Trust in the Lord with all your heart and lean not on your own understanding.', 'Proverbs 3:5'),
  ('The Lord is my shepherd, I lack nothing.', 'Psalm 23:1'),
  ('Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.', 'Joshua 1:9')
on conflict do nothing;

-- ── ORGANIZATION / ABOUT ─────────────────────────────────────
create table if not exists organization (
  id              uuid primary key default gen_random_uuid(),
  name            varchar(200) default 'Kristujayanti CY',
  tagline         varchar(500),
  about_text      text,
  vision          text,
  mission         text,
  founded_year    smallint,
  logo_url        text,
  contact_email   varchar(200),
  contact_phone   varchar(20),
  facebook_url    text,
  instagram_url   text,
  youtube_url     text,
  committee       jsonb default '[]',
  past_presidents jsonb default '[]',
  updated_at      timestamp default now()
);

insert into organization (name, tagline, founded_year)
values ('Kristujayanti CY', 'United in Faith, Growing Together', 2000)
on conflict do nothing;

-- ── SETTINGS ─────────────────────────────────────────────────
create table if not exists settings (
  key        varchar(100) primary key,
  value      text,
  updated_at timestamp default now()
);

insert into settings (key, value) values
  ('app_theme_colour', '#6366f1'),
  ('otp_dev_bypass',   'false')
on conflict (key) do nothing;

-- ── AUDIT LOGS ───────────────────────────────────────────────
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references admins(id) on delete set null,
  admin_name varchar(200),
  action     varchar(100) not null,
  entity     varchar(100),
  entity_id  uuid,
  detail     text,
  created_at timestamp default now()
);

-- ── INDEXES ──────────────────────────────────────────────────
create index if not exists idx_admins_phone    on admins(phone);
create index if not exists idx_admins_team     on admins(team_id);
create index if not exists idx_admins_role     on admins(role);
create index if not exists idx_events_date     on events(event_date);
create index if not exists idx_media_event     on media(event_id);
create index if not exists idx_prayer_week     on prayer_schedules(week_start);
create index if not exists idx_audit_admin     on audit_logs(admin_id);
create index if not exists idx_audit_created   on audit_logs(created_at desc);
create index if not exists idx_notifications_created on notifications(created_at desc);

-- ── ROW LEVEL SECURITY (disable for service role access) ─────
alter table admins            disable row level security;
alter table teams             disable row level security;
alter table events            disable row level security;
alter table media             disable row level security;
alter table notifications     disable row level security;
alter table prayer_schedules  disable row level security;
alter table bible_quotes      disable row level security;
alter table organization      disable row level security;
alter table settings          disable row level security;
alter table audit_logs        disable row level security;
alter table otp_sessions      disable row level security;
