"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the password reset link
      }
    });
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError(labels.auth.resetPassword.errorPasswordMismatch);
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(labels.auth.resetPassword.errorPasswordLength);
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(labels.auth.resetPassword.success);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">
              {labels.auth.resetPassword.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {labels.auth.resetPassword.subtitle}
            </p>
          </div>

          {error ? (
            <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-6 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              {message}
            </p>
          ) : null}

          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {labels.auth.resetPassword.newPasswordLabel}
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {labels.auth.resetPassword.confirmPasswordLabel}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? labels.auth.resetPassword.updating
                : labels.auth.resetPassword.updatePassword}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
