import { NextRequest, NextResponse } from "next/server";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function POST(request: NextRequest) {
  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: "Deepgram API key not configured" },
      { status: 500 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let audioBuffer: ArrayBuffer;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("audio") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No audio file provided" },
          { status: 400 },
        );
      }
      audioBuffer = await file.arrayBuffer();
      mimeType = file.type || "audio/webm";
    } else {
      // Raw binary body
      audioBuffer = await request.arrayBuffer();
      mimeType = contentType || "audio/webm";
    }

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Empty audio data" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 },
      );
    }

    const result = await response.json();
    const transcript =
      result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
