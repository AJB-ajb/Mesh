"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const error = searchParams.get("error");
  const next = searchParams.get("next");
  const getCallbackUrl = () => {
    const origin = window.location.origin;
    return next
      ? `${origin}/callback?next=${encodeURIComponent(next)}`
      : `${origin}/callback`;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setFormError(signInError.message);
      setIsLoading(false);
    } else {
      router.push(next || "/dashboard");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingProvider("google");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (signInError) {
      setLoadingProvider(null);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoadingProvider("github");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (signInError) {
      setLoadingProvider(null);
    }
  };

  const handleLinkedInSignIn = async () => {
    setLoadingProvider("linkedin");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: getCallbackUrl(),
      },
    });

    if (signInError) {
      setLoadingProvider(null);
    }
  };

  const isOAuthLoading = loadingProvider !== null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to MeshIt.
        </p>
      </div>

      {error || formError ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || formError}
        </p>
      ) : null}

      <form onSubmit={handleEmailSignIn} className="mt-6 space-y-4">
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
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
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || isOAuthLoading}
        >
          {isLoading ? "Signing in..." : "Sign in"}
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
        Don&apos;t have an account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-8">
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold">Welcome back</h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to continue to MeshIt.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Button type="button" className="w-full" disabled>
                  Loading...
                </Button>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
