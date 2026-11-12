// RN 0.79 requires a non-null Bundle in Arguments.fromBundle.
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname,'../node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt');
const original = fs.readFileSync(file,'utf8');
const fixed = original.replace(/Arguments\.fromBundle\(\s*(musicService\.tracks\[[^\]]+\]\.originalItem)\s*\)/g,'$1?.let { Arguments.fromBundle(it) }');
fs.writeFileSync(file,fixed);
