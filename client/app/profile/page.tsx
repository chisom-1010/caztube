'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/api';
import AuthForm from '../../components/AuthForm';
import VideoUpload from '../../components/VideoUpload';
import VideoList from '../../components/VideoList';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LogOut, Video, Eye } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Video as VideoType } from '../../shared/types/video';

export default function ProfilePage() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  const [myVideos, setMyVideos] = useState<VideoType[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadMyVideos = async () => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const allVideos = await apiClient.getVideos();
      setMyVideos(allVideos.filter((v) => v.owner_id === user.id));
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMyVideos();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && dashboardRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        dashboardRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 }
      ).fromTo(
        '.dashboard-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 },
        '-=0.2'
      );
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    apiClient.logout();
    logout();
    toast('Logged Out', { description: 'See you next time!' });
    router.push('/');
  };

  const handleUploadComplete = () => {
    toast('Upload Successful!', { description: 'Your video is now live.' });
    loadMyVideos();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <AuthForm />
      </div>
    );
  }

  const totalViews = myVideos.reduce((sum, v) => sum + v.views, 0);

  return (
    <div ref={dashboardRef} className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Video className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">caZTube</h1>
                <Badge variant="secondary" className="text-xs">
                  {user.username}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Browse
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  Settings
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="dashboard-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : myVideos.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Videos you've uploaded
              </p>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : totalViews}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all your videos
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="dashboard-card">
          <VideoUpload onUploadComplete={handleUploadComplete} />
        </div>

        <div className="dashboard-card">
          <h2 className="text-lg font-semibold mb-2 px-6">My Videos</h2>
          <VideoList
            videos={myVideos}
            onVideoClick={(video) => router.push(`/video/${video.id}`)}
          />
        </div>
      </main>
    </div>
  );
}
