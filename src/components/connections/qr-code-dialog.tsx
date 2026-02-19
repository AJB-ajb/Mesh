"use client";

import { useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { labels } from "@/lib/labels";

type QrCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string | null;
  onCopied?: () => void;
};

export function QrCodeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onCopied,
}: QrCodeDialogProps) {
  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile/${userId}`
      : `/profile/${userId}`;

  const handleCopyLink = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile/${userId}`
        : `/profile/${userId}`;
    await navigator.clipboard.writeText(url);
    onCopied?.();
  }, [userId, onCopied]);

  const handleDownloadQr = useCallback(() => {
    // Find the SVG and convert to canvas/PNG
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `mesh-profile-qr.png`;
      a.click();
    };

    img.src = url;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{labels.connectionsPage.qrCodeTitle}</DialogTitle>
          <DialogDescription>
            {labels.connectionsPage.qrCodeDescription(
              userName || labels.common.unknown,
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg border border-border p-4 bg-white">
            <QRCodeSVG
              id="qr-code-svg"
              value={profileUrl}
              size={200}
              level="M"
            />
          </div>
          {userName && (
            <p className="text-sm font-medium text-center">{userName}</p>
          )}
          <p className="text-xs text-muted-foreground text-center break-all">
            {profileUrl}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4" />
            {labels.connectionsPage.copyLink}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadQr}
          >
            <Download className="h-4 w-4" />
            {labels.connectionsPage.downloadQr}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
