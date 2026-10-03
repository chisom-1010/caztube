"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api";
import { Video } from "../../../shared/types/video";
import VideoList from "../../../components/VideoList";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, Home, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import VideoJsPlayer from "../../../components/VideoPlayer";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [moreVideos, setMoreVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;

    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.getVideo(videoId);
        if (cancelled) return;
        setVideo(data);

        const all = await apiClient.getVideos();
        if (cancelled) return;
        setMoreVideos(all.filter((v) => v.id !== videoId).slice(0, 6));
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load video";
        setError(message);
        toast("Error", { description: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVideo();
    return () => {
      cancelled = true;
    };
  }, [videoId, retryCount]);

  const handleRetry = () => setRetryCount((prev) => prev + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-4 bg-muted animate-pulse rounded w-48" />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4">
          <div className="space-y-6">
            <div className="aspect-video bg-muted animate-pulse rounded-lg flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading video player...
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">
            Video Not Found
          </h1>
          <p className="text-muted-foreground">
            {error || "The video you requested could not be found."}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Link href="/">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-lg font-semibold truncate max-w-md">
                {video.title}
              </h1>
            </div>

            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <VideoJsPlayer video={video} autoplay />

            <div className="mt-6">
              <h1 className="text-2xl font-bold">{video.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {video.views} views
              </p>
              {video.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  {video.description}
                </p>
              )}
            </div>
          </div>

          <div className="xl:col-span-1 w-full">
            <h2 className="text-xl font-bold mb-6">More Videos</h2>
            <VideoList
              videos={moreVideos}
              onVideoClick={(clickedVideo) =>
                router.push(`/video/${clickedVideo.id}`)
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
