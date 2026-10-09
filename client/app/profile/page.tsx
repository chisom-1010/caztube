"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "../../components/AuthForm";
import { useAuth } from "../../hooks/useAuth";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already authenticated. This has to run in an effect, not
  // directly in the render body — calling router.push() while rendering
  // triggers a React warning and can fire on every re-render. Now that auth
  // state is shared app-wide (via AuthProvider), `user` is reliably
  // populated here as soon as someone is logged in, so this path runs far
  // more often than before — worth doing properly.
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleAuthSuccess = () => {
    router.push("/profile");
  };

  if (loading || user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <AuthForm onAuthSuccess={handleAuthSuccess} className="w-full max-w-md" />
    </div>
  );
}
