"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
import { useOAuthSignIn } from "@/lib/hooks/use-oauth-sign-in";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
  const { loadingProvider, signIn, isOAuthLoading } =
    useOAuthSignIn(getCallbackUrl);

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
      router.push(next || "/active");
    }
  };

  return (
    <AuthLayout
      title={labels.auth.login.title}
      subtitle={labels.auth.login.subtitle}
      footer={
        <>
          {labels.auth.login.noAccount}{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="text-primary hover:underline"
          >
            {labels.common.signUp}
          </Link>
        </>
      }
    >
      {error || formError ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || formError}
        </p>
      ) : null}

      <form onSubmit={handleEmailSignIn} className="mt-6 space-y-4">
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
            disabled={isLoading || isOAuthLoading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              {labels.common.passwordLabel}
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {labels.auth.login.forgotPassword}
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
          {isLoading ? labels.auth.login.signingIn : labels.common.signIn}
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
          className="flex-1"
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
          className="flex-1"
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
          className="flex-1"
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout
          title={labels.auth.login.title}
          subtitle={labels.auth.login.subtitle}
        >
          <div className="mt-6 space-y-3">
            <Button type="button" className="w-full" disabled>
              {labels.common.loading}
            </Button>
          </div>
        </AuthLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
