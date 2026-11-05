# Happy Birthday Mrs. Frieboth

Reels from two crews. Light a candle for each one you watch.

```
frieboth-birthday/
├── public/                  <- the whole site, this is what Render serves
│   ├── index.html
│   ├── css/                 tokens, base, gate, hero, candles, theater, credits
│   ├── js/                  main, player, queue, candles, ambient, reveal, config, util
│   ├── data/crew.json       names, groups, video files, the birthday message
│   ├── assets/favicon.svg
│   └── videos/              put the .mp4 files here
├── scripts/convert.sh       turns iPhone .mov into web-safe .mp4
├── render.yaml              Render static site config
└── package.json
```

## Run it locally

```bash
npm run dev
```

Open http://localhost:5173. It has to run from a server, because the page loads `data/crew.json`.

## Add or change the videos

Everything lives in `public/data/crew.json`. Each reel has a name, a group (`current` or `last`),
an optional one-line `note`, and a list of `sources` that the browser tries in order.

```json
{ "name": "Emma", "group": "current", "note": "Best advice ever",
  "sources": ["videos/IMG_5840.mp4", "videos/IMG_5840.mov"] }
```

The candle count, the credit roll, and the "0 of 4 lit" counter all follow the number of reels,
so adding another video is one more block in that file.

### iPhone .mov files

Many iPhone clips are HEVC, which Chrome and Firefox will not play. Drop the .mov files in
`public/videos/` and run:

```bash
npm run convert
```

That writes an .mp4 next to each one (smaller and plays everywhere). Keep the .mp4 name first in `sources`.

## Deploy on Render

1. Push this folder to a GitHub repo.
2. Render dashboard, New, **Static Site**, pick the repo.
3. Build command: leave empty. Publish directory: `public`. (`render.yaml` already says this, so
   you can also use New, Blueprint.)
4. Deploy. Send her the link.

## Using Supabase for the videos (optional)

Not needed, since the videos are small after conversion. If you want it anyway: create a public
bucket in Supabase Storage, upload the .mp4 files, and paste each public URL into `sources`
in `crew.json`. Full URLs work as-is.

## Controls

Space play and pause, left and right arrows switch reels, M mutes, F goes fullscreen.
