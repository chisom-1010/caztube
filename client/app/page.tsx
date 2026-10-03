"use client";

import { useEffect, useRef } from "react";
import VideoList from "../components/VideoList";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Play, Sparkles } from "lucide-react";
import Header from "../components/Header";
import gsap from "gsap";

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero section animation
    if (heroRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        heroRef.current.querySelector(".hero-title"),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      ).fromTo(
        heroRef.current.querySelector(".hero-subtitle"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.4"
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      {/* Hero Section */}
      <section ref={heroRef} className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="hero-title">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Stream Amazing
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent block">
                Content
              </span>
            </h1>
          </div>

          <div className="hero-subtitle">
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover, watch, and enjoy high-quality videos from our curated
              collection. Built with modern technology for the best streaming
              experience.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for videos..."
                className="pl-10 pr-4 h-12 text-base"
              />
              <Button
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div className="absolute top-40 right-20 opacity-20">
          <Play className="h-8 w-8 text-primary/60 animate-bounce" />
        </div>
      </section>

      {/* Video Grid */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Videos</h2>
            <p className="text-muted-foreground">
              Explore our collection of high-quality content
            </p>
          </div>

          <VideoList />
        </div>
      </section>
    </div>
  );
}
