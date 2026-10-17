"""Generate the Google Play promo voiceover (edge-tts, en-US-AndrewNeural).

Writes one MP3 per scene to public/play/ and remotion/play/timing.json with
each clip's duration, which the PlayPromo composition uses for scene lengths.
Run: python scripts/play-promo-voiceover.py
"""
import asyncio, json, pathlib, re, subprocess

import edge_tts

FFMPEG = r"C:/Users/Andrew/Documents/Codex/2026-09-08/hi/work/video/packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
VOICE, RATE = "en-US-AndrewNeural", "+4%"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "play"

SCENES = [
    ("hook", "Could your backyard be earning rent? LotFoundry shows you what your lot can do, in about a minute."),
    ("find", "Start with your address. LotFoundry pulls your parcel, local zoning, and your area's market rents."),
    ("earn", "See what a backyard home could earn. On this Seattle demo lot, about two thousand and fifty dollars a month."),
    ("shape", "Then shape it. Place an ADU in 3D, right on your lot, and see whether it fits."),
    ("check", "Check feasibility: an estimated build range, rent, and payback, plus what to verify before you permit."),
    ("cta", "LotFoundry. Find out what your backyard can do. Available now on Google Play."),
]


def duration(path: pathlib.Path) -> float:
    err = subprocess.run([FFMPEG, "-i", str(path), "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    h, m, s = re.findall(r"time=(\d+):(\d+):([\d.]+)", err)[-1]
    return int(h) * 3600 + int(m) * 60 + float(s)


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    timing = []
    for key, text in SCENES:
        path = OUT / f"vo-{key}.mp3"
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(path))
        timing.append({"key": key, "text": text, "src": f"play/vo-{key}.mp3",
                       "seconds": round(duration(path), 3)})
        print(key, timing[-1]["seconds"])
    (ROOT / "remotion" / "play" / "timing.json").write_text(json.dumps(timing, indent=2) + "\n")


asyncio.run(main())
