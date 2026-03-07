---
name: adb-android
description: "ADB commands for Android development and Capacitor device deployment. Use this skill when the user mentions ADB, Android debugging, USB debugging, device testing, Capacitor device deployment, logcat, or needs to interact with a connected Android device."
---

# ADB Commands for Capacitor Android Development

Quick reference for Android Debug Bridge commands used during Capacitor development and on-device testing.

## Device Connection

- `adb devices` — list connected devices (run first to verify connection)
- `adb reconnect` — reconnect a dropped device
- `adb usb` — restart ADB in USB mode
- `adb connect <ip>:<port>` — connect wirelessly (Android 11+, same network)
- `adb kill-server` — kill ADB server (use when connections are broken)
- `adb start-server` — restart ADB server

## App Management

- `adb shell am start -S -n <package>/.MainActivity` — force restart app
- `adb shell am force-stop <package>` — kill app
- `adb shell pm clear <package>` — clear app data and cache
- `adb install -r <path>.apk` — install or replace APK
- `adb uninstall <package>` — uninstall app

## Screenshots & Screen Recording

- `adb shell screencap -p /sdcard/screen.png` — take screenshot
- `adb pull /sdcard/screen.png /tmp/local.png` — pull screenshot to local machine
- `adb shell screenrecord /sdcard/video.mp4` — record screen (Ctrl+C to stop)

## Logs

- `adb logcat -d -t 100` — last 100 log lines (dumps and exits)
- `adb logcat -d | grep -i "keyword"` — filter logs by keyword
- `adb logcat -c` — clear log buffer
- `adb logcat *:E` — show errors only
- `adb bugreport > bugreport.zip` — generate comprehensive bug report

## Network & Debugging

- `adb forward tcp:9222 localabstract:webview_devtools_remote_<id>` — Chrome DevTools remote debugging
- `adb reverse tcp:3000 tcp:3000` — reverse port forwarding (device accesses host's localhost:3000)
- `adb shell dumpsys window displays` — display info (useful for safe area debugging)
- `adb shell dumpsys activity top` — show current foreground activity
- `adb shell settings get global http_proxy` — check device proxy setting

## File Transfer

- `adb push <local> <remote>` — copy file to device
- `adb pull <remote> <local>` — copy file from device

## System

- `adb reboot` — reboot device
- `adb get-serialno` — get device serial number
- `adb shell getprop ro.build.version.sdk` — get API level
- `adb shell wm size` — get screen resolution
- `adb shell wm density` — get screen density

## Capacitor-Specific

- **Mesh app package**: `app.meshit.mesh`, activity: `.MainActivity`
- Build and deploy to device:
  ```
  CAPACITOR_SERVER_URL=http://<ip>:<port> npx cap run android --target <device_id>
  ```
- Sync web assets to Android project:
  ```
  npx cap sync android
  ```
- Android manifest and network security config may need `usesCleartextTraffic="true"` for local HTTP dev servers
- On Android 15+, `env(safe-area-inset-top)` may return 0 — use Capacitor 8's SystemBars CSS variable injection instead
