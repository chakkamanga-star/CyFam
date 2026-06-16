import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client with full access (service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Client-side client (anon key — used in browser components)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Admin = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: 'Super Admin' | 'President' | 'Secretary' | 'Media Admin' | 'Team Leader' | 'Member' | 'Alumni';
  team_id: string | null;
  photo_url: string | null;
  dob: string | null;
  is_active: boolean;
  is_alumni: boolean;
  joined_at: string;
  created_at: string;
  teams?: { name: string; colour: string } | null;
};

export type Team = {
  id: string;
  name: string;
  colour: string;
};

export type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  type: string;
  banner_url: string | null;
  team_id: string | null;
  is_recurring: boolean;
  created_by: string | null;
  created_at: string;
  teams?: { name: string } | null;
};

export type MediaItem = {
  id: string;
  file_url: string;
  thumb_url: string | null;
  album_name: string | null;
  event_id: string | null;
  uploaded_by: string | null;
  file_size: number | null;
  created_at: string;
  events?: { title: string } | null;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'important' | 'emergency';
  target_type: 'all' | 'team' | 'individual';
  target_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};
