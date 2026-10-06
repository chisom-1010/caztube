"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Upload, CheckCircle, FileVideo } from "lucide-react";
import { toast } from "sonner";
import gsap from "gsap";
import type { Video } from "../shared/types/video";

interface VideoUploadProps {
  onUploadComplete?: (video: Video) => void;
  className?: string;
}

// Uploads a file directly to R2 via a presigned URL, reporting real progress.
// fetch() has no upload-progress event, so XMLHttpRequest is used here instead.
function uploadToR2(uploadUrl: string, file: File | Blob, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload to storage failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(file);
  });
}

// Grabs a single frame from the video file client-side (no server-side ffmpeg
// needed) by loading it into a hidden <video>, seeking a bit in, and drawing
// that frame to a <canvas>. Returns a JPEG blob.
function captureThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      // Seek a little into the clip so we don't grab a black first frame.
      const target = Number.isFinite(video.duration) ? Math.min(1, video.duration / 2) : 0;
      video.currentTime = target || 0;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        cleanup();
        reject(new Error("Could not create a thumbnail from this video"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Could not generate thumbnail image"));
        },
        "image/jpeg",
        0.8
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video file for thumbnail"));
    };
  });
}

export default function VideoUpload({ onUploadComplete, className }: VideoUploadProps) {
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    toast("File Selected", {
      description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
    });
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setProgress(0);
    setUploadSuccess(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      toast("Missing Information", {
        description: "Please select a file and enter a title",
      });
      return;
    }

    if (!file.type.startsWith("video/")) {
      toast("Invalid File Type", { description: "Please select a video file" });
      return;
    }

    if (!user) {
      toast("Not Signed In", { description: "Please sign in before uploading" });
      return;
    }

    setUploading(true);
    setUploadSuccess(false);

    if (progressRef.current) {
      gsap.fromTo(
        progressRef.current,
        { opacity: 0, height: 0 },
        { opacity: 1, height: "auto", duration: 0.3 }
      );
    }

    try {
      // 1. Get a presigned URL (and the R2 key the file will live at)
      const { upload_url, r2_key } = await apiClient.getUploadUrl(file.name, file.type);

      // 2. Upload the file straight to R2, with real progress
      await uploadToR2(upload_url, file, setProgress);

      // 3. Best-effort thumbnail: grab a frame client-side and upload it too.
      //    If this fails for any reason, we still proceed without one.
      let thumbnailKey: string | undefined;
      try {
        const thumbBlob = await captureThumbnail(file);
        const thumbFile = new File([thumbBlob], `${file.name}.thumb.jpg`, {
          type: "image/jpeg",
        });
        const { upload_url: thumbUploadUrl, r2_key: thumbR2Key } = await apiClient.getUploadUrl(
          thumbFile.name,
          thumbFile.type
        );
        await uploadToR2(thumbUploadUrl, thumbFile, () => {});
        thumbnailKey = thumbR2Key;
      } catch (thumbError) {
        console.warn("Thumbnail generation failed, continuing without one:", thumbError);
      }

      // 4. Register the video's metadata — the backend reads the owner from
      //    the Bearer token api.ts attaches automatically, no need to pass it here
      const video = await apiClient.createVideo(
        title.trim(),
        description.trim() || undefined,
        r2_key,
        thumbnailKey
      );

      setProgress(100);

      setTimeout(() => {
        setUploadSuccess(true);
        if (successRef.current) {
          gsap.fromTo(
            successRef.current,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
          );
        }
      }, 300);

      setTimeout(() => {
        resetForm();
        if (progressRef.current) {
          gsap.to(progressRef.current, { opacity: 0, height: 0, duration: 0.3 });
        }
        onUploadComplete?.(video);
        toast("Upload Successful!", {
          description: "Your video has been uploaded successfully.",
        });
      }, 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred during upload";
      toast("Upload Failed", { description: message });

      setProgress(0);
      if (progressRef.current) {
        gsap.to(progressRef.current, { opacity: 0, height: 0, duration: 0.3 });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card ref={cardRef} className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Video
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-file">Video File</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileVideo className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              disabled={uploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              disabled={uploading}
              className="min-h-[80px]"
            />
          </div>

          <div ref={progressRef} className="opacity-0 space-y-2">
            {uploading && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </>
            )}

            {uploadSuccess && (
              <div ref={successRef} className="flex items-center justify-center text-green-600 py-2">
                <CheckCircle className="h-5 w-5 mr-2" />
                Upload Complete!
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
