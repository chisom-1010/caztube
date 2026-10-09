'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Video } from '../shared/types/video';
import { apiClient } from '../lib/api';

interface VideoJsPlayerProps {
  video: Video;
  autoplay?: boolean;
}

export default function VideoJsPlayer({ video, autoplay = false }: VideoJsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Resolve the playable R2 URL for this video id
  useEffect(() => {
    let cancelled = false;

    apiClient
      .getStreamUrl(video.id)
      .then(({ stream_url }) => {
        if (!cancelled) setStreamUrl(stream_url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not resolve the video URL');
      });

    return () => {
      cancelled = true;
    };
  }, [video.id]);

  useEffect(() => {
    if (!videoRef.current || !streamUrl || useFallback) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay,
      preload: 'auto',
      // `fill` (not `fluid`): the player stretches to exactly match its
      // parent's box. The parent div below already fixes the box via
      // Tailwind's `aspect-video` + `overflow-hidden`. `fluid` instead
      // calculates its OWN box from the video's native aspect ratio, which
      // — when it doesn't match 16:9 — produced a taller/shorter player
      // than the visible container, so `overflow-hidden` clipped the
      // bottom of the picture and the control bar along with it.
      fill: true,
      sources: [{ src: streamUrl, type: 'video/mp4' }],
      html5: { vhs: { overrideNative: true } },
    });

    playerRef.current = player;

    player.on('error', () => {
      const err = player.error();
      setError(`Playback error (${err?.code}): ${err?.message}`);
      setUseFallback(true);
    });

    player.on('loadedmetadata', () => {
      if (player.videoWidth() === 0 || player.videoHeight() === 0) {
        setError('Video track not found. Trying native player...');
        setUseFallback(true);
      }
    });

    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, [streamUrl, autoplay, useFallback]);

  if (!streamUrl && !error) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error || useFallback) {
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {streamUrl && (
          <video
            src={streamUrl}
            controls
            autoPlay={autoplay}
            className="h-full w-full"
            onError={() => setError('Native playback failed. Try downloading.')}
          />
        )}
        {error && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      {/* `data-vjs-player` tells video.js not to wrap this in an extra div;
          with fill:true the player sizes itself off the nearest positioned
          ancestor, which is this `relative` container. */}
      <div data-vjs-player className="h-full w-full">
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          controls
          preload="auto"
          playsInline
        />
      </div>
    </div>
  );
}
