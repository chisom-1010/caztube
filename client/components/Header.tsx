"use client";

import React from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Play, TrendingUp } from "lucide-react";
import UserNavigation from "./UserNavigation";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                caZTube
              </h1>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <TrendingUp className="h-4 w-4 mr-2" />
                Browse
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">Dashboard</Link>
            </Button>

            {/* ✅ User Navigation - This is where the profile dropdown appears */}
            <UserNavigation />
          </nav>
        </div>
      </div>
    </header>
  );
}
