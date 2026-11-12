# Nawa Android — implementation log
Target: offline local audio library, Android system playback controls, Voice Memos recorder with isolation and gain, rotating player, MP4 composer, and a distinct launcher icon. React Native UI; Electron is future work.
Baseline: build 3, ARM64. On-device report: no media notification and video export failed. Existing player uses expo-audio without a MediaSession. Existing scanner discards clips under 20 seconds. Recorder uses a custom Android AudioRecord module writing WAV.
Order: library and playback → recorder → landscape → video composition. Record implementation and test outcomes below. Never infer device behavior from Gradle success.

## Changes since build 3
- Native track-player media service owns the local queue and supplies Android notification/lock-screen controls. Playback controls operate on the same native session as the UI. SDK 53 stays on the legacy architecture; scripts/track-player-compat.cjs adapts two nullable Android Bundles for RN 0.79.
- Library supports short clips, search, A–Z/Z–A sorting, album and artist views, user-named playlists in the private documents directory, and queue order controls. Albums currently group by album title.
- Original rose waveform launcher art in assets/nawa-icon.png. Now Playing uses blurred artwork over a gradient. Portrait places artwork above controls; landscape places a circular cover on the left, volume above transport, timeline below.
- Recorder displays the saved list above the recording panel with live levels, time, red transport and expandable isolation/gain controls. Existing WAV recordings remain readable. Hardware NoiseSuppressor availability and microphone gain require listening tests on an actual phone.
- Video maker captures a 1080×1920 composition with a sharp foreground image and blurred backdrop or selectable gradient, editable text, imported TTF/OTF, and optional status overlay. FFmpeg receives arguments separately; content URIs use SAF, file URIs are decoded. Output can be saved or shared. Failed jobs display encoder output.
- References reviewed: OxygenCobalt/Auxio and skaftab-in/android-music-player. No source from either project copied. No screenshots bundled.
- Verification: local TypeScript passed. GitHub Actions builds ARM64. Android emulator job exercises library, OS session, rotation, recording and MP4 export. Check its result before claiming those flows passed. Physical HONOR 200 listening and visual comparison are pending. Electron port remains a future deliverable.

## On-device automation, first pass
Run 43165606292 (API 34 x86_64) opened and played the fixture, found the app's system media session, opened Now Playing, rotated and found the landscape interface. UIAutomator stopped at the live recording waveform because it could not reach an idle frame. The next test taps the same measured transport position to stop, then checks for the saved memo and exports MP4. Build 4 succeeded; it predates the album grid, repeat/shuffle and recorder cleanup changes.

Follow-up UI: album cover grids and artist/album collection headers; native repeat modes and shuffle of the remaining queue. Recorder pauses library playback before capturing, releases preview playback, and finalizes recordings on navigation. Video keeps its capture view attached while scrolling, validates hex colors before painting. Release config removes INTERNET permission. Device screenshots and failure logs are attached to emulator runs. Version 0.2.0, Android version code 2.
