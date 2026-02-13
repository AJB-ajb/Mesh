# External Services

Reference table of third-party services used by MeshIt.

| Service           | Purpose                                                          | Pricing                  | Docs                                                         |
| ----------------- | ---------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| **Supabase**      | PostgreSQL DB, Auth (OAuth), Realtime, Storage                   | Free tier + usage-based  | [supabase.com/docs](https://supabase.com/docs)               |
| **Google Gemini** | AI text generation (profile extraction, posting parsing)         | Free tier (15 RPM)       | [ai.google.dev/docs](https://ai.google.dev/docs)             |
| **OpenAI**        | Embeddings (text-embedding-3-small, 1536d) for semantic matching | ~$0.02/1M tokens         | [platform.openai.com/docs](https://platform.openai.com/docs) |
| **Resend**        | Transactional email (notifications, digest)                      | Free tier (100/day)      | [resend.com/docs](https://resend.com/docs)                   |
| **ElevenLabs**    | Text-to-speech for match explanations                            | ~$0.30/1K chars          | [elevenlabs.io/docs](https://elevenlabs.io/docs)             |
| **Vercel**        | Hosting (Next.js), serverless functions, CI/CD                   | Free tier + usage-based  | [vercel.com/docs](https://vercel.com/docs)                   |
| **Sentry**        | Error monitoring and performance tracking                        | Free tier (5K events/mo) | [docs.sentry.io](https://docs.sentry.io)                     |
| **PostHog**       | Product analytics, feature flags                                 | Free tier (1M events/mo) | [posthog.com/docs](https://posthog.com/docs)                 |

## Environment Variables

All API keys stored in `.env` (never committed). See `.env.example` for the full list.

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`

Optional: `ELEVENLABS_API_KEY`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
