"use client";

import {
  GraduationCap,
  Users,
  MessageSquare,
  Settings,
  Calendar,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROFILE } from "./mock-data";

export function ProfileView() {
  return (
    <div className="space-y-4 p-4">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Avatar className="size-20">
          <AvatarFallback className="text-2xl">
            {PROFILE.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{PROFILE.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <GraduationCap className="size-4" />
            {PROFILE.university}
          </p>
        </div>
      </div>

      {/* Bio */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm">{PROFILE.bio}</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{PROFILE.connections}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MessageSquare className="size-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{PROFILE.spaces}</p>
              <p className="text-xs text-muted-foreground">Spaces</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {PROFILE.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings links */}
      <div className="space-y-1">
        {[
          { icon: Calendar, label: "Calendar" },
          { icon: Settings, label: "Settings" },
          { icon: LogOut, label: "Sign out" },
        ].map(({ icon: Icon, label }) => (
          <Button
            key={label}
            variant="ghost"
            className="w-full justify-start h-12 text-sm"
          >
            <Icon className="size-4 mr-3" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
