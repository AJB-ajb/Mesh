import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

export const POST = withAuth(async (req) => {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    return apiError("INTERNAL", "Deepgram API key not configured", 500);
  }

  const contentType = req.headers.get("content-type") || "";

  let audioBuffer: ArrayBuffer;
  let mimeType: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) {
      return apiError("VALIDATION", "No audio file provided", 400);
    }
    audioBuffer = await file.arrayBuffer();
    mimeType = file.type || "audio/webm";
  } else {
    // Raw binary body
    audioBuffer = await req.arrayBuffer();
    mimeType = contentType || "audio/webm";
  }

  if (audioBuffer.byteLength === 0) {
    return apiError("VALIDATION", "Empty audio data", 400);
  }

  // Deepgram pre-recorded transcription REST API
  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": mimeType,
      },
      body: audioBuffer,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Deepgram error:", response.status, errorText);
    return apiError("INTERNAL", "Transcription failed", 502);
  }

  const result = await response.json();
  const transcript =
    result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

  return NextResponse.json({ transcript });
});
