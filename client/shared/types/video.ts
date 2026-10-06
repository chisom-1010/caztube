export interface Video {
  id: string;
  owner_id: string;
  owner_username: string;
  title: string;
  description?: string | null;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  thumbnail_url?: string | null;
  status: 'processing' | 'ready' | 'published' | 'failed';
  views: number;
  created_at: string;
}

export interface CreateVideoRequest {
  title: string;
  description?: string;
}

export interface UpdateVideoRequest {
  title?: string;
  description?: string;
}
