export interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AdminProfile {
  admin_id: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  user_id: string;
  admin_id: string | null;
  status: 'open' | 'closed' | 'pending';
  subject: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
  unread_count: number;
  last_message?: string;
  user_profile?: UserProfile;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender_email?: string;
  sender_name?: string;
  sender_profile?: UserProfile | AdminProfile;
}

export interface SupportFilters {
  status: 'all' | 'open' | 'closed' | 'pending';
  search: string;
}