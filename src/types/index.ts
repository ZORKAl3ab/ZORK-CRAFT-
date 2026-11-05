export type CategoryId = 'mods' | 'shaders' | 'skins' | 'maps' | 'versions';

export interface Category {
  id: CategoryId;
  name: string;
  name_ar: string;
  description_ar: string;
  accent_color: string;
  icon: string;
  count: number;
}

export type DownloadType = 'internal' | 'external';

export interface Resource {
  id: string;
  slug: string;
  title: string;
  short_desc: string;
  full_desc: string;
  category_id: CategoryId;
  minecraft_version: string;
  supported_devices: string[];
  compatibility_notes?: string;
  creator: string;
  original_source_url?: string;
  attribution?: string;
  license?: string;
  cover_image: string;
  gallery_images: string[];
  download_type: DownloadType;
  internal_file_path?: string;
  internal_file_name?: string;
  internal_file_size?: number; // bytes
  external_url?: string;
  verified_features: string[];
  installation_steps: string[];
  changelog: string[];
  is_featured: boolean;
  is_published: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface DownloadEvent {
  id: string;
  resource_id: string;
  download_type: DownloadType;
  timestamp: string;
  ip_hash: string;
  user_agent?: string;
}

export interface AdminProfile {
  email: string;
  password_hash: string;
  salt: string;
  must_change_password: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  token: string;
  email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

export interface WebsiteSettings {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  ads_enabled: boolean;
  ads_banner_home: boolean;
  ads_banner_details: boolean;
  ads_provider_code: string;
}

export interface AuditLog {
  id: string;
  event_type: 'login_success' | 'login_failed' | 'password_changed' | 'session_revoked' | 'resource_created' | 'resource_updated' | 'resource_deleted' | 'resource_published' | 'file_uploaded' | 'file_deleted';
  details: string;
  ip_hash: string;
  timestamp: string;
  success: boolean;
}
