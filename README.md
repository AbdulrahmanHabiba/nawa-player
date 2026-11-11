# Nawa — نَوا

An offline Android audio player with voice recording and video creation, built with React Native and Expo.

## Features
- Local audio library, album artwork, portrait and landscape playback.
- Voice recorder with noise suppression and sensitivity controls.
- Video maker with audio, images or gradients, text overlays and MP4 export.

## Development
Requires Node.js 20+, JDK 17 and an Android SDK. Expo Go does not include the custom native module.

```sh
npm install
npm run typecheck
npx expo prebuild --platform android
npx expo run:android
```

## APK builds
Push to `main`, then open GitHub Actions. Successful builds upload an APK artifact and publish it under Releases.

## Validation status
TypeScript checking, Expo Android prebuild and Metro/Hermes Android export pass. The custom metadata/recording module is discovered by Expo autolinking. The original retired FFmpeg dependency has been replaced with @nikhil-cephei/ffmpeg-kit-react-native 6.0.12 (full-gpl); its Android AAR download was verified. GitHub Actions completed a full Gradle release APK build successfully (build 2, source commit `815f825d402147a4061ab29b9de03583bbe45fbd`). Device tests are still pending. Lock-screen media controls are not implemented in this SDK version. See HANDOFF.md for details.

## Repository metadata
Suggested repository: `nawa-player`

Description: `Offline Android audio player with voice recording and video creation. Built with React Native and Expo.`

Topics: `android`, `react-native`, `expo`, `audio-player`, `voice-recorder`, `video-maker`, `typescript`, `offline`

## First test APK
[Download Nawa build 2](https://github.com/AbdulrahmanHabiba/nawa-player/releases/download/build-2/app-release.apk) (about 184 MB).

This is an initial test build using the generated development signing key. Playback, recording, rotation and MP4 export still need testing on a physical Android device. The legacy React Native architecture is enabled for FFmpeg compatibility.
