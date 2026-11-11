# Current handoff — Nawa (2026-11-11)

This section supersedes conflicting statements in the original notes below.

- App: Nawa; slug/repository: nawa-player; Android package: com.abdulrahman.nawa.
- Replaced retired FFmpeg package with @nikhil-cephei/ffmpeg-kit-react-native 6.0.12 and its Expo full-gpl config plugin; verified upstream AAR is a valid ZIP with classes.jar.
- Updated the local module Gradle script to the Expo SDK 53 plugin API.
- Removed a call to setActiveForLockScreen: it does not exist in expo-audio 0.4.9 and would fail at runtime. Lock-screen controls remain pending.
- Added package-lock.json, npm ci and type checking to the build workflow; upload/release steps fail if the APK is missing.
- TypeScript, Expo Android prebuild and Metro/Hermes Android export passed. Added missing expo-asset and explicit expo-font dependencies for bundling. Expo autolinking finds MusicMetaModule.
- Full Gradle build, signing review, device playback/recording/export tests remain pending. Generated release projects currently use the Expo development signing key; configure a private stable release keystore before public distribution.
- Target repository: https://github.com/AbdulrahmanHabiba/nawa-player (created by project owner). Source upload and the first GitHub Actions build are in progress.
- FFmpeg install postinstall timed out through this workspace proxy; direct curl download of the same AAR succeeded. GitHub Actions must verify npm ci and native linking in its own environment.
- full-gpl FFmpeg distribution carries GPLv3 obligations; review dependency licensing before public distribution.

---
Original implementation notes (historical):

# Apple Music Clone (Android) — HANDOFF

> Update this file after every step. Any agent: read it fully first, then continue from "Remaining".

## Goal
Clone the iPhone Music app (iOS 26 look: dark-red gradient, blurred artwork, star/more buttons, glass controls) for Android using **React Native (Expo + dev client)**.
Later: **Electron** version for PC.
**Local only**: plays on-device audio files. No streaming, no accounts.

## Required features
0. Core player: scan local audio, library list, Now Playing screen (iOS 26 style), mini player, queue, seek, volume.
1. **Voice recorder** — identical to iPhone Voice Memos look; noise isolation ON/OFF + sensitivity slider; premium style.
2. **Screen rotation** — landscape layout like reference (artwork circle left, controls right, volume top, seek bottom, "NOW PLAYING" header, gradient glass).
3. **Video maker** — input: audio (from library/recording) + optional image.
   - No image → user picks color(s) → gradient; background = same gradient.
   - Image → background blurred, blur % adjustable.
   - Editable text overlay + font choice.
   - Toggle fake iPhone status bar (wifi/battery/time) on/off in the video.
   - Export MP4.

## Order of work (do in this order, credits may run out)
- [x] Step 0: Project scaffold + local library + Now Playing (portrait) — **code written, NOT yet run on a device**
- [x] Step 1: Voice recorder — code written, NOT yet run on device
- [x] Step 2 (done early, user's choice): Video maker — code written, NOT yet run on device
- [x] Step 3: Landscape layout (Now Playing only) — code written, NOT run on device
- [x] Step 4a: Album artwork + ID3 metadata — local native module `modules/music-meta` (MediaMetadataRetriever), code written, NOT built/tested
- [x] Step 4b: Lock-screen / notification controls — `player.setActiveForLockScreen` (expo-audio) + background playback, NOT tested
- [x] Step 4c: REAL noise isolation + sensitivity — native `AudioRecord` + `NoiseSuppressor` + software gain/noise-gate, saves WAV, NOT tested
- [ ] Step 4d: queue sheet, rename/delete recordings, WAV->M4A, next/prev on lock screen
- [ ] Step 5: Electron/PC port

## Cloud build (no computer needed)
- `.github/workflows/build-apk.yml`: on every push to `main` (or manual "Run workflow") GitHub builds the APK and publishes it under **Releases** (direct download link, installable from the phone). NOT yet run: first run will likely need fixes (check the Actions log).
- Alternative: `eas.json` (profile `preview`, APK) for Expo EAS Build (needs a free expo.dev account).

## Done (files)
- `package.json`, `app.json` — Expo SDK 53 deps: expo-audio, expo-media-library, expo-linear-gradient, expo-blur, zustand
- `src/theme.ts` — colors
- `src/store/player.ts` — zustand store: queue, play/pause/next/prev/seek/volume (expo-audio `createAudioPlayer`)
- `src/audio/library.ts` — permission + scan audio via MediaLibrary
- `src/screens/Library.tsx` — song list
- `src/screens/NowPlaying.tsx` — iOS-style player (portrait)
- `src/screens/Recorder.tsx` — Voice Memos style: record/stop, live waveform, noise isolation toggle, sensitivity slider, saved list + playback (saved to documentDirectory/recordings, m4a)
- `src/screens/VideoMaker.tsx` — 9:16 preview (captured by view-shot at 1080x1920), audio picker (file or current song), optional image w/ blur slider, else gradient presets + 2 hex inputs, editable text + 6 fonts + size, status-bar toggle, export MP4 via ffmpeg (still image + audio, `-shortest`) then share sheet
- Landscape: `NowPlaying.tsx` switches layout when width > height (circle artwork left; volume top, NOW PLAYING + title, controls, seek bottom). `app.json` orientation = default.
- `App.tsx` — wires Library + Now Playing sheet + mini player

## Native module (modules/music-meta) — IMPORTANT
Local Expo module (Kotlin, Android only), autolinked from `/modules`. Needs `npx expo prebuild --clean` after pulling. If Gradle fails, compare `android/build.gradle` with what `npx create-expo-module@latest --local` generates for your SDK version.
- `read(uri,key)` -> {title, artist, album, artwork(file://)} ; artwork cached in cacheDir
- `startRecording(path,isolation,sens)` / `stopRecording()` / `setIsolation` / `setSensitivity` (live) / event `onMeter {level}`
- Isolation = Android `NoiseSuppressor` (if device supports it) + a software noise gate. Sensitivity = input gain 0.5x-4x + gate threshold. Output = 16-bit mono 44.1k WAV.
- Lock screen: expo-audio exposes play/pause/seek only. For Next/Previous buttons migrate to `react-native-track-player`.

## Known gaps (Step 1) — [partly superseded: isolation now real, see above]
- Noise isolation + sensitivity currently only affect the **waveform gate (UI)**, NOT the recorded audio. TODO: Expo config plugin / native module using `AudioSource.VOICE_RECOGNITION` + `NoiseSuppressor` + `AutomaticGainControl`, and sensitivity -> gain/noise-gate applied on save (ffmpeg `afftdn`/`agate`).
- (old) Recording duration of previously saved items shows blank (not persisted). Rename/delete/trim not implemented.
- Tab bar is a simple custom one in App.tsx (Songs / Record).

## Known gaps (Video Maker)
- `ffmpeg-kit-react-native` was officially retired (Apr 2025); npm binaries may be missing. If install/build fails use a maintained fork (e.g. `@spreen/ffmpeg-kit-react-native`) and keep the same `FFmpegKit.execute` call. Need a package with libx264 (`video`/`full-gpl` variant), otherwise switch codec to `mpeg4`.
- Image blur uses RN `blurRadius` (visually capped ~25 on Android). Status-bar mock time is fixed "9:41" (make editable).
- Only system fonts; add custom fonts via `expo-font` (@expo-google-fonts) for more choice.
- Output is 9:16 only; add 1:1 / 16:9 options; add waveform/progress bar & song title/artwork overlay; audio trim.
- Export goes to share sheet; add direct save-to-gallery (MediaLibrary.saveToLibraryAsync + write permission).
- content:// audio URIs from the picker are copied to cache first (copyToCacheDirectory), so plain file path works.

## Known gaps (Landscape)
- Library / Recorder / Video screens are not specially laid out for landscape (they just reflow). Bottom tab bar + mini player overlap in landscape: consider hiding them.
- Verify rotation inside the Modal on a real device (`supportedOrientations` set).

## Remaining / Notes for the next agent
- Run: `npm i && npx expo prebuild && npx expo run:android` (dev client; Expo Go lacks media permissions for audio).
- Artwork: MediaLibrary has NO artwork/artist/album. Add `react-native-track-player` or `jsmediatags`/native reader for ID3 tags + cover; until then gradient placeholder is used.
- Background playback + lock-screen controls: use `react-native-track-player` (Step 4).
- Voice recorder: `expo-audio` `useAudioRecorder`; noise isolation on Android → `MediaRecorder.AudioSource.VOICE_RECOGNITION` + `NoiseSuppressor` (needs small native module/config plugin). Sensitivity = input gain/threshold in UI + post-process (noise gate).
- Video maker: render frame with `react-native-skia`/`react-native-view-shot` → `ffmpeg-kit-react-native` to mux audio + image/gradient → MP4. Fonts via `expo-font`.
- Electron: keep logic in `src/store` + `src/audio` framework-agnostic; use `react-native-web` or rewrite UI in React DOM; scan music via Node `fs` + `music-metadata`.
- Fonts: iOS uses SF Pro → use `Inter` as closest free alternative.
