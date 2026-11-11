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
TypeScript checking, Expo Android prebuild and Metro/Hermes Android export pass. The custom metadata/recording module is discovered by Expo autolinking. The original retired FFmpeg dependency has been replaced with @nikhil-cephei/ffmpeg-kit-react-native 6.0.12 (full-gpl); its Android AAR download was verified. A full Gradle build and device tests are still pending. Lock-screen media controls are not implemented in this SDK version. See HANDOFF.md for details.

## Repository metadata
Suggested repository: `nawa-player`

Description: `Offline Android audio player with voice recording and video creation. Built with React Native and Expo.`

Topics: `android`, `react-native`, `expo`, `audio-player`, `voice-recorder`, `video-maker`, `typescript`, `offline`
