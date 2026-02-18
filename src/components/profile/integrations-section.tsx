"use client";

import { Github, Linkedin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleIcon } from "@/components/icons/auth-icons";

type Provider = {
  key: "github" | "linkedin" | "google";
  icon: React.ReactNode;
  label: string;
  description: string;
  linkProvider: "github" | "google" | "linkedin_oidc";
};

const providers: Provider[] = [
  {
    key: "github",
    icon: <Github className="h-5 w-5" />,
    label: "GitHub",
    description: "Primary filter for project matching",
    linkProvider: "github",
  },
  {
    key: "linkedin",
    icon: <Linkedin className="h-5 w-5" />,
    label: "LinkedIn",
    description: "Professional profile enrichment",
    linkProvider: "linkedin_oidc",
  },
  {
    key: "google",
    icon: <GoogleIcon className="h-5 w-5" />,
    label: "Google",
    description: "Enhanced account security",
    linkProvider: "google",
  },
];

export function IntegrationsSection({
  connectedProviders,
  isEditing,
  onLinkProvider,
}: {
  connectedProviders: { github: boolean; google: boolean; linkedin: boolean };
  isEditing: boolean;
  onLinkProvider?: (provider: "github" | "google" | "linkedin_oidc") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        {isEditing ? (
          <CardDescription>
            Connect your GitHub, LinkedIn, and Google accounts to enrich your
            profile
          </CardDescription>
        ) : (
          <CardDescription>
            Connected accounts for profile enrichment
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.key}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              {provider.icon}
              <div>
                <p className="font-medium">{provider.label}</p>
                <p className="text-xs text-muted-foreground">
                  {provider.description}
                </p>
              </div>
            </div>
            {connectedProviders[provider.key] ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : onLinkProvider ? (
              <Button
                onClick={() => onLinkProvider(provider.linkProvider)}
                variant="outline"
                size="sm"
              >
                Connect
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not connected
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
