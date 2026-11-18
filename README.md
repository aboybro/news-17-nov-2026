[![make.fun](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117)
[![rank](https://make.fun/badge/news-image-20261117/aboybro/news-17-nov-2026/rank.svg)](https://make.fun/bounty/news-image-20261117)
[![reward](https://make.fun/badge/news-image-20261117/aboybro/news-17-nov-2026/reward.svg)](https://make.fun/bounty/news-image-20261117)

# The World Today — Tuesday 17 November 2026

A one-day world news front page, drawn entirely in code: **29 stories from Tuesday
17 November 2026, across six continents**, with a world map marking the day's
flashpoints. Entry for the make.fun bounty
[news-image-20261117](https://make.fun/bounty/news-image-20261117).

Lead story: US strikes on Iran's Qeshm Island after attacks on shipping in the
Strait of Hormuz. Also inside: Ukraine hits the Kerch Bridge, Trump arrives in
Shenzhen for the first summit with Xi and Putin, Nvidia's chief is out after a
spy scandal, the US loses its measles elimination status, and Gaza's aid call —
plus 24 more briefs, each reported on 17 November 2026.

## How it works

`main.ts` (Node 22, standard library only) draws the whole front page
procedurally — a hand-built 5x7 bitmap font, a polygon world map, flat
pictograms — and encodes a deterministic PNG with its own encoder (zlib +
CRC32, no timestamps). No assets, no network, no randomness: two runs write
byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png — 1024x1024, ~28 KB
```

## Sources

Reuters, AP, NPR, United Nations, PAHO. Every event in the image was reported
on Tuesday 17 November 2026.

SPDX-License-Identifier: MIT
