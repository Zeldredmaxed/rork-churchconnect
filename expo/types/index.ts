export type UserRole = 'member' | 'leader' | 'admin' | 'pastor';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  church_id: string;
  phone?: string;
  avatar_url?: string;
  username?: string;
  bio?: string;
  pronouns?: string;
  gender?: string;
  link?: string;
  membership_status?: string;
  created_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface Church {
  id: number | string;
  name: string;
  subdomain: string;
  logo_url?: string | null;
  is_active?: boolean;
  address?: string;
  youtube_channel_id?: string;
}

export interface FeedPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  visibility: 'all' | 'leaders';
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
  post_type?: 'text' | 'photo' | 'video';
  media_urls?: string[];
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'service' | 'event' | 'meeting' | 'conference';
  location: string;
  start_date: string;
  end_date: string;
  max_capacity?: number;
  rsvp_count: number;
  registration_required: boolean;
  is_recurring: boolean;
  is_rsvped?: boolean;
  status: 'upcoming' | 'ongoing' | 'cancelled' | 'completed';
  created_at: string;
}

export interface Prayer {
  id: string;
  title: string;
  description: string;
  category: 'general' | 'health' | 'family' | 'financial' | 'spiritual';
  is_anonymous: boolean;
  is_urgent: boolean;
  is_answered: boolean;
  author_name: string;
  author_id: string;
  pray_count: number;
  has_prayed?: boolean;
  response_count?: number;
  created_at: string;
}

export interface PrayerResponse {
  id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface Short {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  author_id?: string;
  author_name?: string;
  church_name: string;
  church_id: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_liked?: boolean;
  category?: string;
  created_at: string;
}

export interface Sermon {
  id: string;
  title: string;
  speaker: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: string;
  is_live: boolean;
  like_count: number;
  view_count: number;
  is_liked?: boolean;
  created_at: string;
}

export interface SermonNote {
  id: string;
  sermon_id: string;
  content: string;
  timestamp_marker?: string;
  created_at: string;
}

export interface ActiveScripture {
  id: string;
  book: string;
  chapter: number;
  verses: string;
  text: string;
  pastor_notes?: string;
  created_at: string;
}

export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
}

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  type: string;
  member_count: number;
  leader_id?: string;
  members?: GroupMember[];
  created_at: string;
}

export interface GroupMember {
  id: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

export interface Fund {
  id: string;
  name: string;
  description?: string;
  goal_amount?: number;
  current_amount?: number;
}

export interface Donation {
  id: string;
  amount: number;
  fund_name: string;
  fund_id: string;
  memo?: string;
  receipt_url?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'rsvp' | 'prayer' | 'event' | 'short' | 'follow';
  title: string;
  body: string;
  is_read: boolean;
  user_id?: string;
  is_following_back?: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  membership_status: 'visitor' | 'prospect' | 'active';
  family_name?: string;
  created_at: string;
}

export interface MemberNote {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface MemberEngagement {
  attendance_rate: number;
  giving_total: number;
  groups_joined: number;
  last_active: string;
}

export interface Family {
  id: string;
  name: string;
  members: { id: string; name: string; avatar_url?: string }[];
  created_at: string;
}

export interface AnalyticsOverview {
  total_members: number;
  giving_this_month: number;
  upcoming_events: number;
  active_prayers: number;
  engagement_score: number;
}

export interface GivingTrend {
  month: string;
  amount: number;
}

export interface EngagementData {
  week: string;
  score: number;
  active_users: number;
}

export interface GrowthData {
  stage: string;
  count: number;
}

export interface AttendanceRecord {
  id: string;
  member_name: string;
  event_title: string;
  checked_in_at: string;
}

export interface Comment {
  id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  like_count: number;
  is_liked?: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  participants: { id: string; name: string; avatar_url?: string }[];
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface FlockUser {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  church_name?: string;
  is_following?: boolean;
  followers_count?: number;
  following_count?: number;
}

export interface FollowNotification {
  id: string;
  type: 'follow';
  user_id: string;
  user_name: string;
  user_avatar?: string;
  is_following_back?: boolean;
  created_at: string;
}

export interface SavedItem {
  id: string;
  item_id: string;
  item_type: 'post' | 'short';
  title: string;
  preview: string;
  author_name: string;
  author_id: string;
  saved_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface FinancialSummary {
  total_donations: number;
  total_this_month: number;
  total_this_year: number;
  fund_breakdown: { fund_name: string; amount: number; budget?: number }[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  card_brand?: string;
  last_four?: string;
  exp_month?: number;
  exp_year?: number;
  cardholder_name?: string;
  is_default: boolean;
  created_at: string;
}

export interface BillingAddress {
  full_name: string;
  country: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region: string;
  postal_code: string;
}
