"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {/* 404 */}
      <div className="mb-4 text-8xl font-bold text-muted-foreground/20">
        404
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {labels.notFound.title}
      </h1>

      {/* Description */}
      <p className="mt-4 max-w-md text-muted-foreground">
        {labels.notFound.description}
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            {labels.notFound.goHome}
          </Link>
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          {labels.notFound.goBack}
        </Button>
      </div>
    </div>
  );
}
