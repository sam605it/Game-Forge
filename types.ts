
export interface User {
  id: string;
  username: string;
  email?: string;
  googleId?: string;
  avatar: string; // Emoji or SVG data URI
  tier: SubscriptionTier;
  createdAt: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  timestamp: number;
}

export interface SavedGame {
  id: string;
  title: string;
  code: string;
  timestamp: number;
  prompt: string;
  version: number;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
  color: string;
  isPro?: boolean;
}

export interface CommunityGame {
  id: string;
  title: string;
  author: string;
  description: string;
  likes: number;
  plays: number;
  code: string;
  tags: string[];
}

export type SubscriptionTier = 'free' | 'pro';

export interface UserStats {
  tier: SubscriptionTier;
  monthlyUsage: number;
  lastResetMonth: number; // Month index 0-11
}
