// news-image-20261123 — "The World in One Day"
// Draws a single 1024x1024 PNG summing up world news of Monday 23 November 2026.
// Pure Node 22 stdlib: a tiny 5x7 bitmap font, a flat-colour world map with
// numbered pins, a 40-story index grid and a DATE CHECK footer.
// Deterministic: no clock, no randomness, no network. Two runs = same bytes.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette ---------------------------------------------------------------
const PAPER = [247, 243, 232];
const INK = [20, 30, 46];
const NAVY = [20, 36, 62];
const NAVY2 = [28, 52, 88];
const OCEAN = [191, 217, 232];
const LAND = [196, 198, 158];
const LAND2 = [168, 178, 140];
const WHITE = [255, 255, 255];
const GREY = [110, 116, 120];
const RULE = [190, 182, 160];

// Region colours (also used for story numbers + map pins + legend).
const REGION_COLORS: Record<string, number[]> = {
  NA: [198, 60, 48], // North America — red
  EU: [38, 110, 180], // Europe — blue
  ME: [224, 130, 30], // Middle East — orange
  AF: [120, 80, 160], // Africa — purple
  AS: [28, 140, 90], // Asia — green
  OC: [0, 140, 150], // Oceania — teal
};
const REGION_NAMES: Record<string, string> = {
  NA: "NORTH AMERICA",
  EU: "EUROPE",
  ME: "MIDDLE EAST",
  AF: "AFRICA",
  AS: "ASIA",
  OC: "OCEANIA",
};

// ---- 5x7 bitmap font -------------------------------------------------------
// Each glyph: 7 rows of 5 cells, '#' = ink, '.' = empty. Uppercase + digits +
// common punctuation only; all image text is written in this set.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "%": ["##..#", "##.#.", "....#", "...#.", "..#..", ".#.#.", "#..##"],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "+": [".....", "..#..", "..#..", ".###.", "..#..", "..#..", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", "..#..", ".#..."],
  "=": [".....", ".....", ".###.", ".....", ".###.", ".....", "....."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "*": [".....", "#.#.#", ".###.", "#.#.#", ".....", ".....", "....."],
  "<": ["....#", "...#.", "..#..", ".#...", "..#..", "...#.", "....#"],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.##.", "#....", ".###."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "\u2022": [".....", ".....", ".##..", ".##..", ".....", ".....", "....."],
};
// ---- pixel buffer ----------------------------------------------------------
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: number[]): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(xx, yy, c);
    }
  }
}

function drawCircleOutline(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

// Scanline fill of a simple polygon given as [x, y] pairs.
function fillPolygon(points: number[][], c: number[]): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(Math.round(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = xs[k]; x <= xs[k + 1]; x++) setPixel(x, y, c);
    }
  }
}

// ---- text ------------------------------------------------------------------
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of s) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// ---- PNG encoder (deterministic) -------------------------------------------
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

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
// ---- the day's stories -----------------------------------------------------
// 40 stories, each happened or first reported on Monday 23 November 2026
// (any time zone). Verified against live news listings on the morning of
// 23 Nov 2026. Region codes: NA / EU / ME / AF / AS / OC.
interface Story {
  region: string;
  text: string;
}
const STORIES: Story[] = [
  { region: "AS", text: "UN EXTENDS AI-WEAPONS TALKS 2 YEARS" },
  { region: "AS", text: "NEPAL PM MEETS MODI IN NEW DELHI" },
  { region: "EU", text: "EU BUDGET KEEPS 100BN FOR UKRAINE" },
  { region: "NA", text: "SPY CHIEF: PUTIN 'NO FRIEND' OF US" },
  { region: "NA", text: "US PRESSES ANSWERS ON NVIDIA SALES" },
  { region: "ME", text: "PAKISTAN FM HOPEFUL ON US-IRAN DEAL" },
  { region: "ME", text: "TANKER INCIDENT IN GULF OF OMAN" },
  { region: "EU", text: "POLAND: RUSSIA TRIED TO KILL RAPPER" },
  { region: "AS", text: "MYANMAR SLAMS ASEAN RULING 'UNFAIR'" },
  { region: "EU", text: "LISBON MARCHES OVER LIVING COSTS" },
  { region: "EU", text: "ISTANBUL PROTESTS MEDIA CLOSURES" },
  { region: "AF", text: "S. SUDAN ATTACK KILLS 24 CIVILIANS" },
  { region: "AF", text: "WHO: FIGHTING HITS EBOLA RESPONSE" },
  { region: "ME", text: "EISENKOT: SETTLER VIOLENCE 'TERROR'" },
  { region: "ME", text: "JORDAN BACKS BAHRAIN AFTER ATTACK" },
  { region: "EU", text: "14 MISSING IN DRONE HIT ON KYIV" },
  { region: "EU", text: "RUSSIAN SHIP AFIRE OFF FINLAND" },
  { region: "AS", text: "INDONESIA FACTORY FIRE: 24 DEAD" },
  { region: "NA", text: "ST JOHNS RIVER RECORD FLOOD CREST" },
  { region: "NA", text: "STORM WARNINGS OFF OREGON, CALIF." },
  { region: "AF", text: "SUDAN SHOOTS DOWN ETHIOPIAN DRONES" },
  { region: "NA", text: "COURT HALTS IOWA LEAD-AZIDE BLAST" },
  { region: "NA", text: "FLIGHT CHAOS AFTER FAA GROUND STOP" },
  { region: "NA", text: "MICROSOFT OUTAGE HITS OUTLOOK/TEAMS" },
  { region: "NA", text: "COPA JET CLIPS UPS PLANE AT MIAMI" },
  { region: "NA", text: "GOVERNOR: ICE 'OUT OF CONTROL'" },
  { region: "NA", text: "JUDGES BLOCK TRUMP ARCH, PARK OPEN" },
  { region: "NA", text: "MAN ATTACKS STUDENT IN CAMPUS DORM" },
  { region: "OC", text: "INDIA RECORD 720/9 IN WELLINGTON" },
  { region: "AS", text: "TATA SELLS TUBES ARM FOR 28,000 CR" },
  { region: "AS", text: "MP WADKUTE DIES OF HEART ATTACK" },
  { region: "AS", text: "9 PILGRIMS DIE IN RAJASTHAN CRASH" },
  { region: "AS", text: "SHAH'S 4,000-CR ARUNACHAL PLAN" },
  { region: "AS", text: "MODI OPENS AI CENTRE AT IIT PATNA" },
  { region: "AS", text: "PHILIPPINES LEADS ASIA FARM TALKS" },
  { region: "AS", text: "KOREA MINISTER QUITS OVER AI CHEATS" },
  { region: "AS", text: "TOKYO MARKET SHUT FOR HOLIDAY" },
  { region: "NA", text: "NASDAQ DOWN 10% IN IPO DEBUT WEEK" },
  { region: "NA", text: "TRADR TO LIST 2X ANTHROPIC ETFS" },
  { region: "NA", text: "HUNGER GAMES PREQUEL NO. 1, $120M" },
];

// Stories deliberately LEFT OUT: they happened or were first reported BEFORE
// 23 Nov 2026, so they are not this day's news.
const DATE_CHECK =
  "DATE CHECK - LEFT OUT: THEY HAPPENED OR WERE FIRST REPORTED BEFORE 23 NOV 2026. " +
  "COP31 CLIMATE TALKS COLLAPSE (22 NOV) \u2022 VERSTAPPEN WINS LAS VEGAS GP (22 NOV) \u2022 " +
  "LIVERPOOL 4-0 MAN UTD (22 NOV) \u2022 'EL CHAPO ISIDRO' ARRESTED IN MEXICO (22 NOV) \u2022 " +
  "DELTA COMPUTER OUTAGE (22 NOV) \u2022 FBI CRIME-DATABASE HACK CONFIRMED (21 NOV) \u2022 " +
  "ANTHROPIC IPO DEBUT (19 NOV) \u2022 NIGERIA BOAT CAPSIZES, 24 DEAD (22 NOV) \u2022 " +
  "RUSSIAN WARSHIP SUNK OFF LIBYA (22 NOV) \u2022 MILEY CYRUS WEDS (22 NOV)";

// ---- world map -------------------------------------------------------------
// Equirectangular strip: lon -180..180 -> x 0..1024, lat 75..-55 -> y 142..272.
function ll(lon: number, lat: number): number[] {
  return [Math.round(((lon + 180) / 360) * W), Math.round(217 - lat)];
}
function llPoly(coords: number[][]): number[][] {
  return coords.map(([lon, lat]) => ll(lon, lat));
}

const CONTINENTS: number[][][] = [
  // North America
  llPoly([[-168, 66], [-140, 70], [-125, 72], [-110, 73], [-95, 80], [-85, 70], [-75, 62], [-60, 55], [-55, 47], [-70, 42], [-75, 35], [-80, 26], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-125, 49], [-140, 60], [-165, 60]]),
  // South America
  llPoly([[-80, 10], [-75, 5], [-60, 5], [-50, 0], [-40, -5], [-35, -10], [-40, -20], [-48, -28], [-58, -35], [-65, -40], [-70, -50], [-73, -40], [-73, -25], [-80, -15], [-80, 5]]),
  // Europe
  llPoly([[-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [10, 59], [18, 56], [21, 55], [24, 60], [30, 70], [40, 68], [45, 60], [40, 50], [30, 46], [28, 44], [23, 40], [19, 42], [12, 44], [3, 43], [-2, 37], [-9, 37]]),
  // Africa
  llPoly([[-17, 15], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28], [38, 22], [43, 12], [48, 11], [51, 10], [44, 0], [40, -10], [35, -18], [32, -26], [26, -33], [18, -35], [12, -18], [13, -10], [9, 4], [-8, 4], [-17, 15]]),
  // Asia
  llPoly([[40, 68], [50, 70], [60, 70], [70, 72], [80, 73], [90, 75], [110, 76], [130, 72], [150, 70], [170, 66], [180, 65], [170, 60], [160, 55], [150, 45], [140, 40], [130, 35], [127, 35], [122, 30], [120, 25], [110, 20], [105, 10], [100, 8], [95, 15], [90, 22], [85, 20], [80, 15], [77, 8], [72, 20], [66, 25], [60, 25], [55, 26], [50, 29], [48, 30], [43, 35], [40, 40], [40, 50], [45, 60]]),
  // Australia
  llPoly([[113, -22], [114, -30], [115, -35], [125, -32], [135, -35], [140, -38], [147, -39], [150, -37], [153, -32], [153, -27], [146, -19], [142, -11], [137, -12], [132, -12], [126, -14], [122, -17], [114, -22]]),
  // New Zealand
  llPoly([[167, -45], [172, -41], [175, -38], [178, -37], [174, -40], [168, -44]]),
];

// [story number (1-based), lon, lat] — pins for the biggest stories.
const PINS: number[][] = [
  [1, 8.0, 44.0], // Geneva area — UN AI-weapons talks (offset to clear Brussels)
  [2, 79.0, 26.0], // Delhi — Nepal PM meets Modi (offset to clear Islamabad)
  [3, 0.0, 54.0], // Brussels area — EU budget (offset to clear Geneva)
  [6, 70.0, 35.0], // Islamabad — US-Iran deal hope
  [12, 31.6, 4.9], // Juba — South Sudan attack
  [13, 15.3, -4.3], // Kinshasa — Congo Ebola
  [16, 30.5, 50.4], // Kyiv — drone hit
  [17, 24.0, 60.0], // Gulf of Finland — burning ship
  [18, 106.3, -6.3], // Cikande, Java — factory fire
  [19, -81.5, 28.5], // Florida — record flood crest
  [29, 174.8, -41.3], // Wellington — record Test score
  [37, 139.7, 35.7], // Tokyo — market shut
];

// ---- layout ----------------------------------------------------------------
function drawHeader(): void {
  fillRect(0, 0, W, 118, NAVY);
  fillRect(0, 114, W, 4, [224, 130, 30]);
  drawTextCentered(W / 2, 14, "THE WORLD IN ONE DAY", 2, [191, 217, 232]);
  drawTextCentered(W / 2, 38, "MONDAY 23 NOVEMBER 2026", 4, WHITE);
  drawTextCentered(W / 2, 88, "40 STORIES  •  6 REGIONS  •  FIRST REPORTED 23 NOV 2026", 2, [191, 217, 232]);
}

function drawLegend(): void {
  fillRect(0, 118, W, 24, NAVY2);
  const order = ["NA", "EU", "ME", "AF", "AS", "OC"];
  let x = 24;
  for (const r of order) {
    fillRect(x, 125, 10, 10, REGION_COLORS[r]);
    drawText(x + 14, 125, REGION_NAMES[r], 1, WHITE);
    x += 14 + textWidth(REGION_NAMES[r], 1) + 26;
  }
}

function drawMap(): void {
  fillRect(0, 142, W, 130, OCEAN);
  for (const poly of CONTINENTS) fillPolygon(poly, LAND);
  // Graticule hint: equator line.
  for (let x = 0; x < W; x += 8) setPixel(x, 217, [150, 180, 200]);
  for (const [num, lon, lat] of PINS) {
    const [x, y] = ll(lon, lat);
    const story = STORIES[num - 1];
    fillCircle(x, y, 10, REGION_COLORS[story.region]);
    drawCircleOutline(x, y, 10, WHITE);
    drawTextCentered(x, y - 4, String(num), 1, WHITE);
  }
  drawText(24, 148, "WHERE IT HAPPENED - NUMBERED PINS MATCH THE INDEX BELOW", 1, [40, 70, 95]);
}

function drawStories(): void {
  const colW = 484;
  const colX = [24, 524];
  const top = 284;
  const rowH = 33;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i < 20 ? 0 : 1;
    const row = i % 20;
    const x = colX[col];
    const y = top + row * rowH;
    const s = STORIES[i];
    const c = REGION_COLORS[s.region];
    // zebra row
    if (row % 2 === 0) fillRect(x - 8, y - 6, colW + 16, rowH, [238, 232, 214]);
    drawText(x, y + 4, String(i + 1) + ".", 2, c);
    let text = s.text;
    const maxChars = 35;
    if (text.length > maxChars) text = text.slice(0, maxChars);
    drawText(x + 40, y + 4, text, 2, INK);
  }
  fillRect(0, 276, W, 2, RULE);
  fillRect(508, 284, 2, 660, RULE);
}

function drawFooter(): void {
  fillRect(0, 948, W, 76, NAVY);
  // Wrap DATE_CHECK into lines of at most 168 chars at scale 1 (6 px/char).
  const words = DATE_CHECK.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 168 && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  lines.slice(0, 3).forEach((line, i) => {
    drawText(24, 958 + i * 18, line, 1, i === 0 ? [255, 200, 120] : [220, 225, 230]);
  });
  drawText(24, 1010, "ALL 40 STORIES HAPPENED OR WERE FIRST REPORTED ON MONDAY 23 NOVEMBER 2026.", 1, [150, 165, 185]);
}

function main(): void {
  drawHeader();
  drawLegend();
  drawMap();
  drawStories();
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, encodePNG());
}

main();

