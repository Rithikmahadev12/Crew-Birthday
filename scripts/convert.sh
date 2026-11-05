#!/usr/bin/env bash
# Converts every .mov in public/videos to a web-safe .mp4 (H.264 + AAC, 720p-ish, fast start).
# iPhone .mov files are often HEVC, which Chrome and Firefox cannot play. This fixes that
# and shrinks them a lot, so the page loads fast and stays under GitHub's file size limit.
#
# Needs ffmpeg:  brew install ffmpeg   |   sudo apt install ffmpeg   |   winget install ffmpeg
set -euo pipefail

DIR="$(cd "$(dirname "$0")/../public/videos" && pwd)"
shopt -s nullglob nocaseglob

files=("$DIR"/*.mov)
if [ ${#files[@]} -eq 0 ]; then
  echo "No .mov files found in $DIR"
  exit 0
fi

for f in "${files[@]}"; do
  out="${f%.*}.mp4"
  echo "Converting $(basename "$f") -> $(basename "$out")"
  ffmpeg -y -loglevel error -i "$f" \
    -c:v libx264 -crf 24 -preset slow \
    -vf "scale='min(1280,iw)':-2" -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$out"
done

echo "Done. Point the sources in public/data/crew.json at the .mp4 files."
