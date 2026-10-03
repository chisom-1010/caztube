"use client";

import { useRouter } from "next/navigation";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already authenticated
  if (user) {
    router.push("/");
    return null;
  }

  const handleAuthSuccess = (user: any) => {
    // Redirect to home page after successful auth
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <AuthForm onAuthSuccess={handleAuthSuccess} className="w-full max-w-md" />
    </div>
  );
}
