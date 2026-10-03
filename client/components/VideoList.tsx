'use client';

import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { Video } from '../shared/types/video';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Play, Calendar, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';

interface VideoListProps {
  onVideoClick?: (video: Video) => void;
  className?: string;
  /** Pass a preloaded/filtered list (e.g. one user's videos) to skip the internal fetch. */
  videos?: Video[];
}

export default function VideoList({ onVideoClick, className, videos: providedVideos }: VideoListProps) {
  const [fetchedVideos, setFetchedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(providedVideos === undefined);
  const [error, setError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const videos = providedVideos ?? fetchedVideos;

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

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 ${className}`}>
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
    <div
      ref={gridRef}
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 ${className}`}
    >
      {videos.map((video) => (
        <Card
          key={video.id}
          className="video-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
          onClick={() => handleVideoClick(video)}
        >
          <CardContent className="p-0">
            {/* Placeholder preview — no thumbnail generation yet, so we show
                an icon instead of eagerly loading the full video per card */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <div className="bg-white/10 rounded-full p-4 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                <Play className="h-8 w-8 text-white fill-current" />
              </div>

              {video.duration_seconds != null && (
                <Badge
                  variant="secondary"
                  className="absolute bottom-2 right-2 bg-black/70 text-white"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(video.duration_seconds)}
                </Badge>
              )}

              {video.status === 'processing' && (
                <Badge variant="secondary" className="absolute top-2 left-2 bg-black/70 text-white">
                  Processing…
                </Badge>
              )}
            </div>

            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                {video.title}
              </h3>

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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
