#!/usr/bin/env bash
# Reproduces the live-action field clip from the Pexels source (run from the project root, needs ffmpeg + node).
#  1. Builds the golden-hour sky plate (make-sky.mjs).
#  2. Replaces the midday blue sky: a pixel is "sky" where blue exceeds red by a threshold that is strict
#     high in the frame (keeps thin stems) and permissive near the horizon (removes pale haze). Blue spill on
#     edges is clamped, the matte is softened by 0.8 px, then the plants are warm-graded with a vignette.
#  3. Builds a seamless 12 s loop (last 1.5 s crossfades into the first 1.5 s), 24 fps, light denoise.
#  4. Exports posters and the pre-blurred bokeh plate for the focus frame.
set -euo pipefail
D=media-source/pexels-13943183
SRC=$D/cotton-plants-under-clear-sky-13943183-hd_1920_1080_30fps.mp4
M=$D/graded-golden-hour-master.mp4

node scripts/footage/make-sky.mjs

G="[0:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='min(b(X,Y),max(r(X,Y),g(X,Y))+4)':a='clip(255-(b(X,Y)-r(X,Y)-(34-30*Y/H))*3.4,0,255)',split[c][m];[m]alphaextract,gblur=sigma=0.8[ma];[c][ma]alphamerge[fg];[1:v][fg]overlay=format=auto:shortest=1,format=yuv420p,colorbalance=rs=0.07:bs=-0.08:rm=0.09:gm=0.02:bm=-0.1:rh=0.06:bh=-0.05,eq=gamma=0.96:saturation=1.05,vignette=PI/5"
ffmpeg -v error -y -i "$SRC" -loop 1 -i $D/sky-golden-hour.png -filter_complex "$G[o]" -map "[o]" -an -c:v libx264 -preset medium -crf 14 -pix_fmt yuv420p "$M"

LOOP="[0:v]trim=1.5:13.5,setpts=PTS-STARTPTS[a];[0:v]trim=0:1.5,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=1.5:offset=10.5"
enc() { ffmpeg -v error -y -i "$M" -filter_complex "$LOOP,hqdn3d=3:3:6:6,fps=24,$1[o]" -map "[o]" -an -c:v libx264 -preset slower -crf 28 -tune film -profile:v high -pix_fmt yuv420p -g 96 -bf 3 -movflags +faststart "$2"; }
enc "scale=1280:720" public/video/field-wind-wide.mp4
enc "scale=-2:720,crop=540:720:(iw-540)/2-40:0" public/video/field-wind-tall.mp4

ffmpeg -v error -y -i public/video/field-wind-wide.mp4 -frames:v 1 -c:v libwebp -quality 86 src/assets/film/field-wind-poster-wide.webp
ffmpeg -v error -y -i public/video/field-wind-tall.mp4 -frames:v 1 -c:v libwebp -quality 86 src/assets/film/field-wind-poster-tall.webp
ffmpeg -v error -y -ss 6 -i "$M" -frames:v 1 -vf "scale=960:540,gblur=sigma=22,eq=brightness=-0.04:saturation=1.1,scale=1280:720" -c:v libwebp -quality 80 src/assets/film/field-bokeh.webp
echo "done"
