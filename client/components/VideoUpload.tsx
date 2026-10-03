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
function uploadToR2(uploadUrl: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

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

      // 3. Register the video's metadata — the backend reads the owner from
      //    the Bearer token api.ts attaches automatically, no need to pass it here
      const video = await apiClient.createVideo(title.trim(), description.trim() || undefined, r2_key);

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
