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

const DEFAULT_SETTINGS: UserSettings = {
  is_private_account: false,
  theme_mode: 'system',
  allow_tags_from: 'everyone',
  allow_mentions: true,
  allow_comments_from: 'everyone',
  hide_offensive_comments: true,
  hide_spam_comments: true,
  allow_sharing_to_messages: true,
  allow_resharing_to_stories: true,
  limit_interactions: false,
  hide_like_counts: false,
  hide_share_counts: false,
  autoplay_wifi: true,
  autoplay_cellular: false,
  high_quality_uploads: true,
  data_saver: false,
  save_original_photos: false,
  save_posted_videos: false,
  auto_captions: true,
  larger_text: false,
  reduce_motion: false,
  auto_translate: false,
  language: 'English',
  hide_offensive_words: true,
  show_suggested_posts: true,
};

let localSettings = { ...DEFAULT_SETTINGS };

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    console.log('[Settings-Mock] getSettings');
    return { ...localSettings };
  },

  updateSettings: async (updates: Partial<UserSettings>): Promise<UserSettings> => {
    console.log('[Settings-Mock] updateSettings', Object.keys(updates));
    localSettings = { ...localSettings, ...updates };
    return { ...localSettings };
  },

  getBlocked: async () => {
    console.log('[Settings-Mock] getBlocked');
    return [] as SocialBoundaryUser[];
  },
  blockUser: async (_userId: string) => ({} as SocialBoundaryUser),
  unblockUser: async (_userId: string) => {},

  getRestricted: async () => {
    console.log('[Settings-Mock] getRestricted');
    return [] as SocialBoundaryUser[];
  },
  restrictUser: async (_userId: string) => ({} as SocialBoundaryUser),
  unrestrictUser: async (_userId: string) => {},

  getMuted: async () => {
    console.log('[Settings-Mock] getMuted');
    return [] as SocialBoundaryUser[];
  },
  muteUser: async (_userId: string, _mutePosts = true, _muteStories = true) => ({} as SocialBoundaryUser),
  unmuteUser: async (_userId: string) => {},

  getCloseFriends: async () => {
    console.log('[Settings-Mock] getCloseFriends');
    return [] as SocialBoundaryUser[];
  },
  addCloseFriend: async (_userId: string) => ({} as SocialBoundaryUser),
  removeCloseFriend: async (_userId: string) => {},

  getFavourites: async () => {
    console.log('[Settings-Mock] getFavourites');
    return [] as SocialBoundaryUser[];
  },
  addFavourite: async (_userId: string) => ({} as SocialBoundaryUser),
  removeFavourite: async (_userId: string) => {},

  getHiddenWords: async () => {
    console.log('[Settings-Mock] getHiddenWords');
    return [] as HiddenWord[];
  },
  addHiddenWord: async (_word: string) => ({ id: `hw_${Date.now()}`, word: _word, created_at: new Date().toISOString() } as HiddenWord),
  removeHiddenWord: async (_wordId: string) => {},

  getArchive: async (_type?: 'post' | 'clip' | 'story') => {
    console.log('[Settings-Mock] getArchive');
    return [] as ArchiveItem[];
  },
  archiveContent: async (_contentId: string, _contentType: 'post' | 'clip' | 'story') => ({} as ArchiveItem),
  unarchiveContent: async (_archiveId: string) => {},
};
