#!/bin/bash
# Prop reference extraction from the approved concept (Tripo image-to-image), run serially (account concurrency = 1).
set -u
cd "$(dirname "$0")/.."
CT=0d626fb5-4286-4210-8084-3077c1a5b9d6
tail='as a single complete object, centered, seen in 3/4 view from slightly above, keeping exactly the same design, colors, proportions and materials as in the source image. Plain light-grey seamless studio background, soft even lighting, gentle contact shadow only. Remove the conveyor belt, the wooden table and every other object. Show the whole object with margin around it. --no text, cropping, extra objects'
body() { python3 -c 'import json,sys;print(json.dumps({"model":"chat_image_2.5_flare","size":"1024x1024","quality":"medium","background":"opaque","output_format":"png","prompt":sys.argv[1]}))' "$1"; }
one() {
  python3 tools/tripo_image.py submit --project "$PWD" --operation-id "$1" --kind image --input-task $CT --execute --body "$(body "$2")" >/dev/null
  python3 tools/tripo_image.py resume --project "$PWD" --operation-id "$1" --wait-seconds 240 | grep -E '"status"|credits|image"'
}
python3 tools/tripo_image.py resume --project "$PWD" --operation-id prop-printer-ref-v1 --wait-seconds 240 | grep -E '"status"|credits|image"'
one prop-workbench-ref-v1 "From this image, isolate ONLY the orange craftsman workbench with its drawers, vise, desk lamp, tools, tray, the small grey dragon figure on top and the two storage boxes underneath, $tail"
one prop-critic-ref-v1 "From this image, isolate ONLY the round white display pedestal with the transparent glass cylinder, the purple light ring, the small orange dragon figure on it and the four small cameras on tripods around it, $tail"
one prop-shelf-ref-v1 "From this image, isolate ONLY the grey metal storage shelf with its four shelves of small figures and cardboard boxes, $tail"
