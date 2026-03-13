"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  GoogleIcon,
  GitHubIcon,
  LinkedInIcon,
  LoaderIcon,
} from "@/components/icons/auth-icons";
import {
  useOAuthSignIn,
  getOAuthCallbackUrl,
} from "@/lib/hooks/use-oauth-sign-in";
import { ROUTES } from "@/lib/routes";

function SignUpForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next");
  const getCallbackUrl = () => getOAuthCallbackUrl(next);
  const { loadingProvider, signIn, isOAuthLoading } =
    useOAuthSignIn(getCallbackUrl);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError(labels.auth.signup.errorPasswordMismatch);
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(labels.auth.signup.errorPasswordLength);
      setIsLoading(false);
      return;
    }

    // Check if this email is already registered via an OAuth provider
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (checkData.exists && checkData.providers?.length > 0) {
        const providerNames = (checkData.providers as string[]).map((p) =>
          p === "google"
            ? "Google"
            : p === "github"
              ? "GitHub"
              : p === "linkedin_oidc"
                ? "LinkedIn"
                : p,
        );
        setError(labels.auth.signup.errorDuplicateEmail(providerNames));
        setIsLoading(false);
        return;
      }
    } catch {
      // If the check fails, proceed with signup — Supabase will handle it
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getCallbackUrl(),
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      // Email confirmation disabled — user is immediately authenticated
      const destination = next || ROUTES.spaces;
      window.location.href = destination;
      return;
    }

    // Fallback: email confirmation is enabled, user must verify
    setMessage(labels.auth.signup.checkEmail);
    setIsLoading(false);
  };

  return (
    <AuthLayout
      title={labels.auth.signup.title}
      subtitle={labels.auth.signup.subtitle}
      footer={
        <>
          {labels.auth.signup.alreadyHaveAccount}{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="text-primary hover:underline"
          >
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

      <form onSubmit={handleSignUp} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {labels.common.emailLabel}
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-11 sm:h-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading || isOAuthLoading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {labels.common.passwordLabel}
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="h-11 sm:h-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading || isOAuthLoading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            {labels.auth.signup.confirmPasswordLabel}
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="h-11 sm:h-9"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading || isOAuthLoading}
          />
        </div>
        <Button
          type="submit"
          className="w-full h-11 sm:h-9"
          disabled={isLoading || isOAuthLoading}
        >
          {isLoading
            ? labels.auth.signup.creatingAccount
            : labels.common.signUp}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {labels.common.orContinueWith}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11 sm:h-9"
          onClick={() => signIn("google")}
          disabled={isLoading || isOAuthLoading}
        >
          {loadingProvider === "google" ? (
            <LoaderIcon className="h-5 w-5" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11 sm:h-9"
          onClick={() => signIn("github")}
          disabled={isLoading || isOAuthLoading}
        >
          {loadingProvider === "github" ? (
            <LoaderIcon className="h-5 w-5" />
          ) : (
            <GitHubIcon className="h-5 w-5" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11 sm:h-9"
          onClick={() => signIn("linkedin")}
          disabled={isLoading || isOAuthLoading}
        >
          {loadingProvider === "linkedin" ? (
            <LoaderIcon className="h-5 w-5" />
          ) : (
            <LinkedInIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </AuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
