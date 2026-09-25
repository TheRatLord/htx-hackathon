#!/usr/bin/env bash
# Helper for driving an Android emulator over adb.
# Usage: SERIAL=emulator-5554 OUT=/path/to/dir droid.sh <cmd> [args]
#   shot <name>          screenshot -> $OUT/<name>.png (view it with the Read tool)
#   ui                   compact list of visible UI elements: text | content-desc | id | clickable | [bounds] center=x,y
#   tap <x> <y>          tap at device pixel coords (device is 1080x2400)
#   text "<str>"         type text into focused field
#   key <KEYCODE>        e.g. BACK, HOME, ENTER, TAB
#   swipe x1 y1 x2 y2 [ms]
#   gps <lat> <lon>      set emulator GPS location
#   log                  RideMETRO errors/crashes since last `logclear`
#   logclear
#   launch               start RideMETRO
#   restart              force-stop and relaunch RideMETRO
set -euo pipefail
A=~/Android/Sdk/platform-tools/adb
: "${SERIAL:?set SERIAL}"; OUT=${OUT:-.}; mkdir -p "$OUT"
PKG=com.ridemetro.houstontrip
adb() { "$A" -s "$SERIAL" "$@"; }
case "${1:-}" in
  shot) adb exec-out screencap -p > "$OUT/$2.png"; echo "$OUT/$2.png" ;;
  ui)
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
    adb exec-out cat /sdcard/ui.xml | python3 -c '
import sys, re, xml.etree.ElementTree as ET
try: root = ET.fromstring(sys.stdin.read())
except Exception as e: print("ui dump failed:", e); sys.exit()
for n in root.iter("node"):
    t, d, r = n.get("text",""), n.get("content-desc",""), n.get("resource-id","").split("/")[-1]
    c = n.get("clickable") == "true"
    if not (t or d or c): continue
    b = list(map(int, re.findall(r"\d+", n.get("bounds",""))))
    cx, cy = (b[0]+b[2])//2, (b[1]+b[3])//2
    ck = "CLICK" if c else ""; bd = n.get("bounds")
    print(f"{t!r} | {d!r} | {r} | {ck} | {bd} center={cx},{cy} size={b[2]-b[0]}x{b[3]-b[1]}")' ;;
  tap) adb shell input tap "$2" "$3" ;;
  text) adb shell input text "$(printf '%s' "$2" | sed 's/ /%s/g')" ;;
  key) adb shell input keyevent "KEYCODE_$2" ;;
  swipe) adb shell input swipe "$2" "$3" "$4" "$5" "${6:-300}" ;;
  gps) adb emu geo fix "$3" "$2" >/dev/null ;;
  log)
    adb logcat -d -b crash | tail -40
    pid=$(adb shell pidof $PKG | tr -d '\r' || true)
    [ -n "$pid" ] && adb logcat -d --pid="$pid" '*:W' | tail -60 || echo "(app not running)" ;;
  logclear) adb logcat -c ;;
  launch) adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 ;;
  restart) adb shell am force-stop $PKG; sleep 1; adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 ;;
  *) sed -n '2,17p' "$0" ;;
esac
