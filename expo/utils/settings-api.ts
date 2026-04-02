import { api } from '@/utils/api';

export interface UserSettings {
  id?: number | string;
  user_id?: string;
  is_private_account: boolean;
  theme_mode: 'light' | 'dark' | 'system';
  allow_tags_from: 'everyone' | 'following' | 'nobody';
  allow_mentions: boolean;
  allow_comments_from: 'everyone' | 'following' | 'followers' | 'both' | 'nobody';
  hide_offensive_comments: boolean;
  hide_spam_comments: boolean;
  allow_sharing_to_messages: boolean;
  allow_resharing_to_stories: boolean;
  limit_interactions: boolean;
  hide_like_counts: boolean;
  hide_share_counts: boolean;
  autoplay_wifi: boolean;
  autoplay_cellular: boolean;
  high_quality_uploads: boolean;
  data_saver: boolean;
  save_original_photos: boolean;
  save_posted_videos: boolean;
  auto_captions: boolean;
  larger_text: boolean;
  reduce_motion: boolean;
  auto_translate: boolean;
  language: string;
  hide_offensive_words: boolean;
  show_suggested_posts: boolean;
  filter_offensive_comments?: boolean;
  filter_spam_comments?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SocialBoundaryUser {
  id: string;
  user_id?: string;
  target_user_id?: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  mute_posts?: boolean;
  mute_stories?: boolean;
  created_at?: string;
}

export interface HiddenWord {
  id: string;
  user_id?: string;
  word: string;
  created_at?: string;
}

export interface ArchiveItem {
  id: string;
  content_id: string;
  content_type: 'post' | 'clip' | 'story';
  title?: string;
  content?: string;
  image_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  view_count?: number;
  created_at?: string;
  archived_at?: string;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const raw = await api.get<{ data: UserSettings } | UserSettings>('/settings');
    if (raw && typeof raw === 'object' && 'data' in raw && (raw as Record<string, unknown>).data) {
      return (raw as { data: UserSettings }).data;
    }
    return raw as UserSettings;
  },

  updateSettings: async (updates: Partial<UserSettings>): Promise<UserSettings> => {
    const raw = await api.put<{ data: UserSettings } | UserSettings>('/settings', updates as Record<string, unknown>);
    if (raw && typeof raw === 'object' && 'data' in raw && (raw as Record<string, unknown>).data) {
      return (raw as { data: UserSettings }).data;
    }
    return raw as UserSettings;
  },

  getBlocked: () =>
    api.get<SocialBoundaryUser[]>('/settings/blocked'),
  blockUser: (userId: string) =>
    api.post<SocialBoundaryUser>(`/settings/blocked/${userId}`),
  unblockUser: (userId: string) =>
    api.delete<void>(`/settings/blocked/${userId}`),

  getRestricted: () =>
    api.get<SocialBoundaryUser[]>('/settings/restricted'),
  restrictUser: (userId: string) =>
    api.post<SocialBoundaryUser>(`/settings/restricted/${userId}`),
  unrestrictUser: (userId: string) =>
    api.delete<void>(`/settings/restricted/${userId}`),

  getMuted: () =>
    api.get<SocialBoundaryUser[]>('/settings/muted'),
  muteUser: (userId: string, mutePosts = true, muteStories = true) =>
    api.post<SocialBoundaryUser>(`/settings/muted/${userId}?mute_posts=${mutePosts}&mute_stories=${muteStories}`),
  unmuteUser: (userId: string) =>
    api.delete<void>(`/settings/muted/${userId}`),

  getCloseFriends: () =>
    api.get<SocialBoundaryUser[]>('/settings/close-friends'),
  addCloseFriend: (userId: string) =>
    api.post<SocialBoundaryUser>(`/settings/close-friends/${userId}`),
  removeCloseFriend: (userId: string) =>
    api.delete<void>(`/settings/close-friends/${userId}`),

  getFavourites: () =>
    api.get<SocialBoundaryUser[]>('/settings/favourites'),
  addFavourite: (userId: string) =>
    api.post<SocialBoundaryUser>(`/settings/favourites/${userId}`),
  removeFavourite: (userId: string) =>
    api.delete<void>(`/settings/favourites/${userId}`),

  getHiddenWords: () =>
    api.get<HiddenWord[]>('/settings/hidden-words'),
  addHiddenWord: (word: string) =>
    api.post<HiddenWord>('/settings/hidden-words', { word }),
  removeHiddenWord: (wordId: string) =>
    api.delete<void>(`/settings/hidden-words/${wordId}`),

  getArchive: (type?: 'post' | 'clip' | 'story') =>
    api.get<ArchiveItem[]>(`/settings/archive${type ? `?type=${type}` : ''}`),
  archiveContent: (contentId: string, contentType: 'post' | 'clip' | 'story') =>
    api.post<ArchiveItem>('/settings/archive', { content_id: contentId, content_type: contentType }),
  unarchiveContent: (archiveId: string) =>
    api.delete<void>(`/settings/archive/${archiveId}`),
};
