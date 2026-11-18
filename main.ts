// The World Today — one-day world news front page for Tuesday 17 November 2026.
// Node 22, standard library only. Draws the whole image procedurally (no assets,
// no network) and writes a deterministic PNG to /output/entry.png.
// Run locally: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase + digits + punctuation). Rows are 5 chars wide.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
};

const CHAR_W = 5;
const CHAR_H = 7;

// ---------------------------------------------------------------------------
// Canvas: RGB buffer + drawing primitives
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [251, 247, 236];
const INK: [number, number, number] = [20, 20, 20];
const NAVY: [number, number, number] = [14, 42, 71];
const RED: [number, number, number] = [179, 38, 30];
const WHITE: [number, number, number] = [255, 255, 255];

const img = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  img[i * 3] = PAPER[0];
  img[i * 3 + 1] = PAPER[1];
  img[i * 3 + 2] = PAPER[2];
}

function setPx(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  img[o] = c[0];
  img[o + 1] = c[1];
  img[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      img[o] = c[0];
      img[o + 1] = c[1];
      img[o + 2] = c[2];
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = cx - half; x <= cx + half; x++) setPx(x, y, c);
  }
}

function fillPolygon(pts: Array<[number, number]>, c: [number, number, number]): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(H - 1, Math.floor(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(W - 1, Math.floor(xs[k + 1])); x++) {
        setPx(x, y, c);
      }
    }
  }
}

function star(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: [number, number, number]): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]);
  }
  fillPolygon(pts, c);
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch.toUpperCase()] ?? FONT[' '];
    for (let r = 0; r < CHAR_H; r++) {
      for (let col = 0; col < CHAR_W; col++) {
        if (g[r][col] === '1') {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextRight(text: string, xRight: number, y: number, scale: number, c: [number, number, number]): void {
  drawText(text, xRight - textWidth(text, scale), y, scale, c);
}

function drawTextCenter(text: string, cx: number, y: number, scale: number, c: [number, number, number]): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// World map (equirectangular, lon/lat polygons)
// ---------------------------------------------------------------------------
const MAP_X = 24;
const MAP_Y = 322;
const MAP_W = 976;
const MAP_H = 124;
const OCEAN: [number, number, number] = [214, 231, 240];
const LAND: [number, number, number] = [91, 126, 153];

function project(lon: number, lat: number): [number, number] {
  return [MAP_X + Math.round(((lon + 170) / 360) * MAP_W), MAP_Y + Math.round(((75 - lat) / 135) * MAP_H)];
}

const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-140, 70], [-120, 72], [-95, 80], [-85, 73], [-75, 62], [-55, 52], [-60, 46], [-75, 35], [-80, 25], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-125, 49], [-145, 60], [-165, 60]],
  // Greenland
  [[-45, 60], [-40, 65], [-30, 68], [-22, 70], [-25, 76], [-40, 76], [-55, 74], [-58, 64]],
  // South America
  [[-80, 10], [-75, 5], [-60, 5], [-50, 0], [-35, -8], [-40, -20], [-48, -28], [-58, -38], [-65, -45], [-70, -55], [-73, -40], [-73, -20], [-80, -5]],
  // Africa
  [[-17, 15], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28], [40, 15], [43, 11], [51, 10], [40, 0], [35, -18], [30, -30], [20, -35], [12, -18], [9, 4], [-8, 5]],
  // Europe
  [[-10, 36], [-9, 43], [0, 44], [3, 43], [7, 44], [10, 45], [12, 54], [8, 57], [5, 60], [12, 62], [18, 70], [30, 70], [40, 68], [45, 60], [40, 55], [30, 50], [28, 45], [23, 40], [19, 42], [12, 44]],
  // Asia
  [[40, 68], [60, 70], [70, 73], [90, 75], [110, 76], [130, 72], [150, 70], [170, 66], [178, 65], [170, 60], [160, 55], [150, 45], [140, 40], [130, 35], [122, 30], [115, 22], [108, 12], [105, 8], [100, 8], [95, 15], [90, 22], [85, 20], [80, 10], [75, 8], [70, 20], [65, 25], [60, 25], [55, 26], [50, 28], [48, 30], [44, 30], [40, 35]],
  // Australia
  [[113, -22], [114, -30], [115, -35], [124, -33], [130, -32], [137, -35], [140, -38], [147, -39], [150, -37], [153, -27], [146, -19], [142, -11], [136, -12], [132, -11], [126, -14], [122, -17], [114, -22]],
  // UK
  [[-5, 50], [-3, 53], [-5, 56], [-2, 58], [0, 53]],
];

// Numbered flashpoints: [label, lon, lat, dy nudge]
const DOTS: Array<[string, number, number, number]> = [
  ['1', 56, 26.5, 0], // Qeshm / Iran
  ['2', 34.5, 45.3, -4], // Kerch Bridge
  ['3', 114, 22.5, 0], // Shenzhen
  ['4', 121, 14.6, 0], // Manila
  ['5', 2.3, 48.9, 0], // Paris
  ['6', -77, 38.9, 0], // Washington
  ['7', 34.5, 31.5, 4], // Gaza
  ['8', 139.7, 35.7, 0], // Tokyo
];

// ---------------------------------------------------------------------------
// Content — every event reported on Tuesday 17 November 2026
// ---------------------------------------------------------------------------
const LEAD_HEADLINE = 'US STRIKES IRAN';
const LEAD_BODY =
  'US warplanes hit a missile site on Qeshm Island after Iranian attacks on shipping in the Strait of Hormuz. Iran fired drones at a US radar site in Bahrain; a burning tanker was evacuated off Oman.';

type Group = { name: string; color: [number, number, number]; items: string[] };
const GROUPS: Group[] = [
  {
    name: 'MIDDLE EAST',
    color: [179, 38, 30],
    items: [
      'IRAN DRONES HIT US RADAR SITE IN BAHRAIN, THIRD ATTACK IN DAYS',
      'BURNING GAS TANKER TARA GAS EVACUATED: 24 CREW SAVED OFF OMAN',
      'HOUTHIS FIRE FIVE DRONES AT SAUDI OIL PIPELINE PUMPING STATIONS',
      'ISRAELI STRIKES HIT SOUTHERN LEBANON; SHELLING AND BLASTS REPORTED',
      'UK, AUSTRALIA, CANADA, ITALY URGE ISRAEL TO OPEN GAZA AID CROSSINGS',
      'WINTER RAINS FLOOD GAZA SHELTERS AS UN WARNS OF DEEPENING CRISIS',
      'BRITAIN SANCTIONS EIGHT ISRAELI FIRMS OVER WEST BANK SETTLEMENTS',
    ],
  },
  {
    name: 'EUROPE',
    color: [31, 78, 121],
    items: [
      'UKRAINE HITS KERCH BRIDGE: ROAD SPAN FALLS, TRAFFIC HALTED',
      'RAMSTEIN ALLIES MEET IN BRUSSELS, PLEDGE NEW UKRAINE AID',
      'FRANCE: 140,000 JOIN PUBLIC-SECTOR PAY PROTESTS IN PARIS',
      'DEPARDIEU DROPS APPEAL AND ADMITS SEXUAL ASSAULT CHARGE',
      'MAN CHARGED OVER ATTACK THAT DESTROYED US C-130 IN IRELAND',
    ],
  },
  {
    name: 'ASIA-PACIFIC',
    color: [14, 124, 107],
    items: [
      'TRUMP ARRIVES IN SHENZHEN FOR FIRST SUMMIT WITH XI AND PUTIN',
      'XI URGES FREE TRADE AS CHINA HOSTS ASIA-PACIFIC LEADERS',
      'MODI JOINS ASEAN-INDIA SUMMIT IN MANILA',
      'QUAD LEADERS UNVEIL CRITICAL-MINERALS PACTS IN MANILA',
      'JAPAN SCRAMBLES JETS AS RUSSIAN PLANES ENTER ITS AIRSPACE',
      'CYCLONE BEARS DOWN ON ANDHRA PRADESH COAST',
    ],
  },
  {
    name: 'AMERICAS',
    color: [46, 125, 50],
    items: [
      'US LOSES MEASLES ELIMINATION STATUS, FIRST TIME SINCE 2000',
      'APPLE AND NSA HIT BY OUTAGES; EXPERTS BLAME PATCHING, NOT HACKING',
      'FAA PAUSES ROUTER INSTALLS AFTER NATIONWIDE GROUND STOP',
      'WALL STREET FALLS AS AI STOCKS SLIDE; NVIDIA IN FOCUS',
      'NVIDIA BOARD WILL NOT REINSTATE JENSEN HUANG AFTER SPY SCANDAL',
      "US TIGHTENS AI CHIP EXPORT RULES TO CURB CHINA'S ACCESS",
    ],
  },
  {
    name: 'TECH AND LIFE',
    color: [106, 61, 154],
    items: [
      'DUBAI AIRPORT TRAFFIC DOWN 28% IN FIRST NINE MONTHS OF 2026',
      'RIO TINTO PAYS $250M TO REPAIR PANGUNA MINE IN BOUGAINVILLE',
      'BANGLADESH GARMENT WORKERS PROTEST FOR HIGHER WAGES',
      'UN: HORMONE-DISRUPTING CHEMICALS COST $1.1 TRILLION A YEAR',
    ],
  },
];

const ALSO1 = 'ALSO: BUFFETT DONATES $5.5BN - TIGER WOODS TO RETURN IN DECEMBER';
const ALSO2 = 'BECKHAM FIRM SUES COTY FOR $41M - NATIONAL GEOGRAPHIC PICTURES OF THE YEAR';
const SOURCES = 'SOURCES: REUTERS, AP, NPR, UN, PAHO - ALL EVENTS REPORTED 17 NOVEMBER 2026';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const MX = 32; // side margin
const CONTENT_W = W - MX * 2;

// Masthead
fillRect(0, 0, W, 100, NAVY);
drawText('THE WORLD TODAY', MX, 14, 4, WHITE);
drawText('TUESDAY, 17 NOVEMBER 2026', MX, 56, 4, WHITE);
drawTextRight('29 STORIES', W - MX, 20, 2, [255, 255, 255]);
drawTextRight('SIX CONTINENTS', W - MX, 44, 2, [200, 214, 226]);
drawTextRight('ONE DAY IN ONE IMAGE', W - MX, 68, 2, [200, 214, 226]);
fillRect(0, 100, W, 6, RED);

// Lead story
drawText('LEAD STORY - MIDDLE EAST', MX, 118, 2, RED);
drawText(LEAD_HEADLINE, MX, 142, 7, INK);
const leadLines = wrapText(LEAD_BODY, 52);
let ly = 202;
for (const line of leadLines) {
  drawText(line, MX, ly, 2, [51, 51, 51]);
  ly += 16;
}
// Lead art: missile, burst, island, waves (right side)
star(880, 168, 52, 22, 12, [232, 89, 12]);
star(880, 168, 30, 13, 12, [242, 160, 7]);
fillPolygon([[742, 232], [828, 196], [846, 206], [776, 236], [758, 244]], [20, 20, 20]); // missile body
fillPolygon([[828, 196], [856, 188], [846, 206]], [20, 20, 20]); // nose
fillPolygon([[758, 244], [742, 252], [762, 238]], [20, 20, 20]); // fin
fillPolygon([[742, 232], [726, 240], [744, 244]], [179, 38, 30]); // flame
for (let i = 0; i < 5; i++) {
  fillCircle(716 - i * 12, 240 + (i % 2) * 3, 3, [242, 160, 7]);
}
fillPolygon([[720, 268], [760, 258], [820, 258], [880, 262], [940, 258], [980, 266], [960, 282], [740, 282]], [74, 110, 74]); // island
drawLine(720, 290, 990, 290, [91, 126, 153]);
drawLine(740, 296, 970, 296, [91, 126, 153]);

// Map
drawText('THE DAY ON THE MAP', MX, 308, 2, INK);
drawTextRight("NUMBERED: THE DAY'S FLASHPOINTS", W - MX, 308, 2, [90, 90, 90]);
fillRect(MAP_X, MAP_Y, MAP_W, MAP_H, OCEAN);
for (const cont of CONTINENTS) {
  fillPolygon(cont.map(([lo, la]) => project(lo, la)), LAND);
}
for (const [label, lo, la, dy] of DOTS) {
  const [x, y] = project(lo, la);
  fillCircle(x, y + dy, 9, RED);
  drawTextCenter(label, x, y + dy - 7, 2, WHITE);
}

// Briefs
let y = 470;
for (const g of GROUPS) {
  drawText(g.name, MX, y, 2, g.color);
  fillRect(MX + textWidth(g.name, 2) + 10, y + 6, CONTENT_W - textWidth(g.name, 2) - 10, 2, g.color);
  y += 15;
  for (const item of g.items) {
    fillRect(MX, y + 4, 6, 6, g.color);
    drawText(item, MX + 14, y, 2, INK);
    y += 14;
  }
}

// Footer
fillRect(0, 944, W, 2, NAVY);
drawText(ALSO1, MX, 954, 2, [51, 51, 51]);
drawText(ALSO2, MX, 968, 2, [51, 51, 51]);
drawText(SOURCES, MX, 984, 2, [90, 90, 90]);
fillRect(0, 998, W, 26, NAVY);
drawTextCenter('TUESDAY 17 NOVEMBER 2026', W / 2, 1005, 2, WHITE);

// ---------------------------------------------------------------------------
// Deterministic PNG encoder (zlib level 9, no timestamps in PNG)
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let row = 0; row < H; row++) {
  raw[row * (1 + W * 3)] = 0;
  img.copy(raw, row * (1 + W * 3) + 1, row * W * 3, (row + 1) * W * 3);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, png);
console.log(`wrote ${outPath} ${png.length} bytes ${W}x${H}`);
