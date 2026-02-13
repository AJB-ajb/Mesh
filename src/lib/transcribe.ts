/**
 * Send an audio blob to the server-side Deepgram transcription endpoint.
 * Used as the `onAudioRecorded` callback for SpeechInput's MediaRecorder fallback
 * (Firefox, Safari — browsers without the Web Speech API).
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Transcription failed");
  }

  const data = await response.json();
  return data.transcript || "";
}
