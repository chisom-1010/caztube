'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Video } from '../shared/types/video';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { Play, Calendar, RefreshCw, Clock, User, Pencil, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';

interface VideoListProps {
  onVideoClick?: (video: Video) => void;
  className?: string;

  videos?: Video[];
  layout?: 'grid' | 'sidebar';
}

export default function VideoList({
  onVideoClick,
  className,
  videos: providedVideos,
  layout = 'grid',
}: VideoListProps) {
  const { user } = useAuth();
  const [fetchedVideos, setFetchedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(providedVideos === undefined);
  const [error, setError] = useState<string | null>(null);

  // Local overrides so an edit shows up immediately without needing to refetch
  // or plumb state back up through the caller that supplied `videos`.
  const [overrides, setOverrides] = useState<Record<string, Video>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Videos removed locally after a successful delete, so the card disappears
  // immediately without needing a refetch.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const isSidebar = layout === 'sidebar';

  const baseVideos = providedVideos ?? fetchedVideos;
  const videos = baseVideos
    .filter((v) => !deletedIds.has(v.id))
    .map((v) => overrides[v.id] ?? v);

  useEffect(() => {
    if (providedVideos !== undefined) return; // caller already supplied the list

    let cancelled = false;

    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.getVideos();
        if (cancelled) return;

        setFetchedVideos(data);

        requestAnimationFrame(() => {
          if (gridRef.current) {
            const cards = gridRef.current.querySelectorAll('.video-card');
            gsap.fromTo(
              cards,
              { opacity: 0, y: 50, scale: 0.9 },
              { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
            );
          }
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load videos';
        setError(message);
        toast('Error Loading Videos', { description: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVideos();
    return () => {
      cancelled = true;
    };
  }, [providedVideos]);

  const handleVideoClick = (video: Video) => {
    if (onVideoClick) {
      onVideoClick(video);
    } else {
      router.push(`/video/${video.id}`);
      toast(`Opening: ${video.title}`, { duration: 2000 });
    }
  };

  const startEdit = (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    setEditingId(video.id);
    setEditTitle(video.title);
    setEditDescription(video.description ?? '');
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = async (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();

    if (!editTitle.trim()) {
      toast('Title Required', { description: 'The title cannot be empty' });
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await apiClient.updateVideo(video.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setOverrides((prev) => ({ ...prev, [video.id]: updated }));
      setEditingId(null);
      toast('Video Updated', { description: 'Title and description saved.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update video';
      toast('Update Failed', { description: message });
    } finally {
      setSavingEdit(false);
    }
  };

  const askDelete = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    setConfirmDeleteId(videoId);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const confirmDelete = async (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    setDeletingId(video.id);
    try {
      await apiClient.deleteVideo(video.id);
      setDeletedIds((prev) => new Set(prev).add(video.id));
      setConfirmDeleteId(null);
      toast('Video Deleted', { description: `"${video.title}" was removed.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete video';
      toast('Delete Failed', { description: message });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const containerClassName = isSidebar
    ? `flex flex-col gap-3 ${className ?? ''}`
    : `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 ${className ?? ''}`;

  if (loading) {
    if (isSidebar) {
      return (
        <div className={containerClassName}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-40 aspect-video rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={containerClassName}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Videos</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Play className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No videos available</h3>
        <p className="text-muted-foreground">Upload some videos to get started!</p>
      </div>
    );
  }

  return (
    <div ref={gridRef} className={containerClassName}>
      {videos.map((video) => {
        const isOwner = !!user && user.id === video.owner_id;
        const isEditing = editingId === video.id;
        const isConfirmingDelete = confirmDeleteId === video.id;
        const isDeleting = deletingId === video.id;

        const thumbnail = (
          <div
            className={`relative bg-black flex items-center justify-center overflow-hidden flex-shrink-0 ${
              isSidebar ? 'w-40 aspect-video rounded-md' : 'aspect-video'
            }`}
          >
            {video.thumbnail_url ? (
              // Real, client-captured thumbnail
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}

            <div
              className={`relative bg-white/10 rounded-full group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 ${
                video.thumbnail_url ? 'bg-black/30' : ''
              } ${isSidebar ? 'p-2' : 'p-4'}`}
            >
              <Play className={`text-white fill-current ${isSidebar ? 'h-4 w-4' : 'h-8 w-8'}`} />
            </div>

            {video.duration_seconds != null && (
              <Badge
                variant="secondary"
                className={`absolute bottom-1 right-1 bg-black/70 text-white ${
                  isSidebar ? 'text-[10px] px-1 py-0 h-auto' : ''
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(video.duration_seconds)}
              </Badge>
            )}

            {video.status === 'processing' && (
              <Badge variant="secondary" className="absolute top-1 left-1 bg-black/70 text-white text-[10px]">
                Processing…
              </Badge>
            )}

            {isOwner && !isEditing && !isConfirmingDelete && (
              <div className="absolute top-1 right-1 flex items-center gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className={`bg-black/70 text-white hover:bg-black/90 ${isSidebar ? 'h-5 w-5' : 'h-7 w-7'}`}
                  onClick={(e) => startEdit(e, video)}
                >
                  <Pencil className={isSidebar ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className={`bg-black/70 text-white hover:bg-red-600 ${isSidebar ? 'h-5 w-5' : 'h-7 w-7'}`}
                  onClick={(e) => askDelete(e, video.id)}
                >
                  <Trash2 className={isSidebar ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
                </Button>
              </div>
            )}

            {isConfirmingDelete && (
              <div
                className={`absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center ${
                  isSidebar ? 'gap-1.5 p-2' : 'gap-3 p-4'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <p className={`text-white font-medium ${isSidebar ? 'text-[11px]' : 'text-sm'}`}>
                  Delete video?
                </p>
                {!isSidebar && <p className="text-white/70 text-xs">This can't be undone.</p>}
                <div className={`flex items-center ${isSidebar ? 'gap-1' : 'gap-2'}`}>
                  <Button
                    size="sm"
                    variant="destructive"
                    className={isSidebar ? 'h-6 px-2 text-[11px]' : ''}
                    onClick={(e) => confirmDelete(e, video)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={isSidebar ? 'h-6 px-2 text-[11px]' : ''}
                    onClick={cancelDelete}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

        const editForm = (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              disabled={savingEdit}
              className={isSidebar ? 'h-8 text-sm' : ''}
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optional)"
              className={isSidebar ? 'min-h-[50px] text-sm' : 'min-h-[70px]'}
              disabled={savingEdit}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={(e) => saveEdit(e, video)}
                disabled={savingEdit || !editTitle.trim()}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        );

        if (isSidebar) {
          return (
            <div
              key={video.id}
              className="video-card flex gap-3 cursor-pointer group"
              onClick={() => !isEditing && !isConfirmingDelete && handleVideoClick(video)}
            >
              {thumbnail}

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  editForm
                ) : (
                  <>
                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {video.title}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{video.owner_username}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {video.views} views · {formatDate(video.created_at)}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        }

        return (
          <Card
            key={video.id}
            className="video-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => !isEditing && !isConfirmingDelete && handleVideoClick(video)}
          >
            <CardContent className="p-0">
              {thumbnail}

              <div className="p-4 space-y-3">
                {isEditing ? (
                  editForm
                ) : (
                  <>
                    <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {video.title}
                    </h3>

                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="h-3 w-3 mr-1" />
                      {video.owner_username}
                    </div>

                    {video.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">{video.views} views</span>

                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(video.created_at)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
