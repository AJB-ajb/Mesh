# Capacitor Android

Native Android shell for Mesh using Capacitor.

## Architecture

**Hosted URL mode** — the Android WebView loads `https://meshit.app`. Web deploys (Vercel) update the app instantly without Play Store review. Native builds are only needed when the shell itself changes (new plugin, icon update, Capacitor version bump).

### Why `server.url` in production?

Capacitor documents `server.url` as a dev/live-reload feature, but it's widely used in production Android apps. Google Play is not strict about WebView apps. If policy ever changes, the fallback is to bundle a static shell that redirects.

Reference: https://github.com/ionic-team/capacitor/discussions/4080

## Prerequisites

- Android Studio (latest stable)
- JDK 21
- Android SDK API 35
- pnpm (project package manager)

## Local Development

### Emulator

```bash
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm cap:sync
pnpm cap:run
```

`10.0.2.2` is the Android emulator's loopback to the host machine.

### Physical device

```bash
CAPACITOR_SERVER_URL=http://<YOUR_LAN_IP>:3000 pnpm cap:sync
pnpm cap:run
```

Ensure the device and dev machine are on the same network.

### Opening in Android Studio

```bash
pnpm cap:open
```

## Build Commands

| Command          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `pnpm cap:sync`  | Sync web assets + plugins to Android project                    |
| `pnpm cap:run`   | Build and run on connected device/emulator                      |
| `pnpm cap:open`  | Open Android project in Android Studio                          |
| `pnpm cap:build` | Build release AAB (`android/app/build/outputs/bundle/release/`) |

## Asset Generation

Source icon: `assets/logo.png` (1024x1024).

Icons and splash screens were generated with ImageMagick from the source SVG at `public/icons/icon.svg`. To regenerate:

```bash
# Regenerate source PNG from SVG
convert -background none -resize 1024x1024 public/icons/icon.svg assets/logo.png

# Then re-run @capacitor/assets (requires sharp/libvips):
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#000000' --iconBackgroundColorDark '#000000' \
  --splashBackgroundColor '#000000' --splashBackgroundColorDark '#000000'
```

If `@capacitor/assets` fails (sharp native module issue), generate manually with ImageMagick at the standard Android density sizes.

## Release Signing

### 1. Generate keystore (one-time)

```bash
keytool -genkeypair -v \
  -keystore ~/.android/meshit-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias meshit \
  -storepass <PASSWORD> -keypass <PASSWORD>
```

### 2. Create `android/keystore.properties` (gitignored)

```properties
storeFile=/home/<user>/.android/meshit-release.jks
storePassword=<PASSWORD>
keyAlias=meshit
keyPassword=<PASSWORD>
```

### 3. Edit `android/app/build.gradle`

Add signing config that loads from `keystore.properties`. See Android docs for the standard pattern.

## What's Committed vs Gitignored

| Path                  | Status     | Notes                                          |
| --------------------- | ---------- | ---------------------------------------------- |
| `android/`            | Committed  | Native project source                          |
| `capacitor.config.ts` | Committed  | Capacitor configuration                        |
| `dist-cap/`           | Committed  | Minimal webDir fallback                        |
| `assets/`             | Committed  | Source icons for asset generation              |
| `*.jks`, `*.keystore` | Gitignored | Release signing keys                           |
| `keystore.properties` | Gitignored | Signing credentials                            |
| `android/app/build/`  | Gitignored | Build artifacts (via Android's own .gitignore) |

## Release / Deployment Process

1. **Web changes**: Push to `main` → Vercel deploys → Android app picks up changes automatically. No native build needed.

2. **Native shell changes** (new plugin, icon/splash update, Capacitor bump, changes to `android/` or `capacitor.config.ts`):

   ```bash
   pnpm cap:sync
   pnpm cap:build
   # Upload AAB to Play Console (manual or via fastlane supply)
   ```

3. Tag the commit: `v0.7.0-android.1` so the Play Store version maps to a git state.

4. CI automation (GitHub Action on tag push) can be added later.

## iOS

Deferred — PWA covers iOS users. When ready: `npx cap add ios`.

## Native Push Notifications

Not yet implemented. Web push via service worker handles notifications for now.
