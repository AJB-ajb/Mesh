"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { labels } from "@/lib/labels";
import {
  type NotificationType,
  type NotificationChannel,
  type NotificationPreferences,
  allNotificationTypes,
  notificationTypeLabels,
} from "@/lib/notifications/preferences";

type NotificationPreferencesCardProps = {
  preferences: NotificationPreferences;
  onToggle: (
    type: NotificationType,
    channel: NotificationChannel,
    checked: boolean,
  ) => void;
};

export function NotificationPreferencesCard({
  preferences,
  onToggle,
}: NotificationPreferencesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.settings.notificationPrefsTitle}</CardTitle>
        <CardDescription>
          {labels.settings.notificationPrefsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">
                  {labels.settings.tableType}
                </th>
                <th className="pb-2 text-center font-medium text-muted-foreground">
                  {labels.settings.tableInApp}
                </th>
                <th className="pb-2 text-center font-medium text-muted-foreground">
                  {labels.settings.tableBrowser}
                </th>
              </tr>
            </thead>
            <tbody>
              {allNotificationTypes.map((type) => (
                <tr key={type} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">{notificationTypeLabels[type]}</td>
                  <td className="py-3 text-center">
                    <Switch
                      checked={preferences.in_app[type]}
                      onCheckedChange={(checked) =>
                        onToggle(type, "in_app", checked)
                      }
                      aria-label={`${notificationTypeLabels[type]} in-app`}
                    />
                  </td>
                  <td className="py-3 text-center">
                    <Switch
                      checked={preferences.browser[type]}
                      onCheckedChange={(checked) =>
                        onToggle(type, "browser", checked)
                      }
                      aria-label={`${notificationTypeLabels[type]} browser`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
