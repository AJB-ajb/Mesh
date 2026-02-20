"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage(labels.auth.forgotPassword.checkEmail);
    }
    setIsLoading(false);
  };

  return (
    <AuthLayout
      title={labels.auth.forgotPassword.title}
      subtitle={labels.auth.forgotPassword.subtitle}
      footer={
        <>
          {labels.auth.forgotPassword.rememberPassword}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {labels.common.signIn}
          </Link>
        </>
      }
    >
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

      <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {labels.common.emailLabel}
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? labels.auth.forgotPassword.sending
            : labels.auth.forgotPassword.sendResetLink}
        </Button>
      </form>
    </AuthLayout>
  );
}
