"""Exercise the release app on a clean Android emulator with a local WAV."""
import re
import subprocess
import time
import wave
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.abdulrahman.nawa"

def adb(*args):
    return subprocess.check_output(["adb", *map(str,args)],text=True)

def screen():
    adb("shell","uiautomator","dump","/sdcard/nawa-ui.xml")
    return ET.fromstring(adb("shell","cat","/sdcard/nawa-ui.xml"))

def find(label, scroll=False, timeout=35):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        for node in screen().iter("node"):
            if label in (node.get("text"), node.get("content-desc")):
                x,y,r,b=map(int,re.findall(r'\d+',node.get("bounds")))
                return (x+r)//2,(y+b)//2
        if scroll: adb("shell","input","swipe","400","920","400","320","330")
        time.sleep(.5)
    raise RuntimeError("Missing UI control: "+label+" "+ET.tostring(screen(),encoding="unicode")[-5000:])

def tap(label, **options):
    adb("shell","input","tap",*find(label,**options))

adb("install","-r","android/app/build/outputs/apk/release/app-release.apk")
for permission in ("READ_MEDIA_AUDIO","RECORD_AUDIO","POST_NOTIFICATIONS"):
    adb("shell","pm","grant",PACKAGE,"android.permission."+permission)
with wave.open("/tmp/NawaFixture.wav","wb") as audio:
    audio.setparams((1,2,16000,0,"NONE",""))
    audio.writeframes(b"\x00\x00"*16000*15)
adb("push","/tmp/NawaFixture.wav","/sdcard/Music/NawaFixture.wav")
adb("shell","am","broadcast","-a","android.intent.action.MEDIA_SCANNER_SCAN_FILE","-d","file:///sdcard/Music/NawaFixture.wav")
time.sleep(3)
adb("shell","am","start","-n",PACKAGE+"/.MainActivity")
tap("NawaFixture")
time.sleep(2)
assert PACKAGE in adb("shell","dumpsys","media_session")
tap("Open Now Playing")
adb("shell","settings","put","system","accelerometer_rotation",0)
adb("shell","settings","put","system","user_rotation",1)
find("NOW PLAYING")
adb("shell","settings","put","system","user_rotation",0)
adb("shell","input","keyevent",4)
tap("Record tab")
tap("Start recording")
time.sleep(2)
tap("Stop recording")
find("Start recording")
tap("Video tab")
tap("Current song",scroll=True)
tap("Export MP4",scroll=True)
tap("Save to gallery",scroll=True,timeout=150)
find("Saved to gallery")
files=adb("shell","find","/sdcard/Movies","/sdcard/DCIM","-iname","nawa-*.mp4").splitlines()
assert files, "No saved MP4 found"
adb("pull",files[-1],"/tmp/nawa-smoke.mp4")
