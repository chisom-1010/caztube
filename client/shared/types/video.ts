export interface Video {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  status: 'processing' | 'published' | 'failed';
  views: number;
  created_at: string;
}

export interface CreateVideoRequest {
  title: string;
  description?: string;
}
