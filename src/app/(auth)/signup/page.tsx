"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  GoogleIcon,
  GitHubIcon,
  LinkedInIcon,
  LoaderIcon,
} from "@/components/icons/auth-icons";

type OAuthProvider = "google" | "github" | "linkedin" | null;

function SignUpForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next");
  const getCallbackUrl = () => {
    const origin = window.location.origin;
    return next
      ? `${origin}/callback?next=${encodeURIComponent(next)}`
      : `${origin}/callback`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
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
      const destination = next || "/postings/new";
      window.location.href = destination;
      return;
    }

    // Fallback: email confirmation is enabled, user must verify
    setMessage("Check your email to confirm your account.");
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoadingProvider("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });
    if (error) setLoadingProvider(null);
  };

  const handleGitHubSignIn = async () => {
    setLoadingProvider("github");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });
    if (error) setLoadingProvider(null);
  };

  const handleLinkedInSignIn = async () => {
    setLoadingProvider("linkedin");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });
    if (error) setLoadingProvider(null);
  };

  const isOAuthLoading = loadingProvider !== null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Sign up to get started with MeshIt.
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

          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isOAuthLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || isOAuthLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || isOAuthLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isOAuthLoading}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleGoogleSignIn}
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
              className="flex-1"
              onClick={handleGitHubSignIn}
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
              className="flex-1"
              onClick={handleLinkedInSignIn}
              disabled={isLoading || isOAuthLoading}
            >
              {loadingProvider === "linkedin" ? (
                <LoaderIcon className="h-5 w-5" />
              ) : (
                <LinkedInIcon className="h-5 w-5" />
              )}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
