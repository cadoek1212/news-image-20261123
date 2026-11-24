// news-image-20261123 v2 — one image summing up world news of Monday 23 Nov 2026.
// Node 22 stdlib only. No network, no clock, no randomness: two runs are byte-identical.
// Draws everything procedurally (5x7 bitmap font, coarse world map, indexed story list)
// and encodes the PNG by hand (zlib deflate + CRC32).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// Palette
const PAPER = [247, 243, 234]; // warm off-white
const INK = [20, 33, 61]; // dark navy text
const RED = [180, 35, 24]; // lead numbers, pins, rules
const NAVY = [20, 33, 61]; // section bars
const LAND = [205, 224, 200]; // map land fill
const LANDLINE = [90, 122, 90]; // map coastline
const GREY = [90, 92, 96]; // secondary text
const WHITE = [255, 255, 255];
const SOFT = [232, 226, 210]; // hairline separators

// 5x7 bitmap font, authored here. "#" = ink. Only capitals + digits + punctuation.
const FONT = {
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
};

Object.assign(FONT, {
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  "(": ["...##", "..#..", ".#...", ".#...", ".#...", "..#..", "...##"],
  ")": ["##...", "..#..", "...#.", "...#.", "...#.", "..#..", "##..."],
  "/": ["....#", "....#", "....#", "..#..", "..#..", ".#...", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
  "+": [".....", "..#..", "..#..", ".###.", "..#..", "..#..", "....."],
  "=": [".....", ".....", ".###.", ".....", ".###.", ".....", "....."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "~": [".....", ".....", ".##.#", "#.#.#", ".....", ".....", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "*": [".....", ".#.#.", "..#..", ".###.", "..#..", ".#.#.", "....."],
});

// ---- canvas ----
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}
function setPix(x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}
function fillRect(x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPix(xx, yy, c);
}
function hline(x0, x1, y, c) {
  for (let x = x0; x <= x1; x++) setPix(x, y, c);
}
function vline(x, y0, y1, c) {
  for (let y = y0; y <= y1; y++) setPix(x, y, c);
}
// Bresenham line
function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPix(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) {
      e += dy;
      x += sx;
    }
    if (e2 <= dx) {
      e += dx;
      y += sy;
    }
  }
}
function fillCircle(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPix(x, y, c);
}
// Even-odd scanline fill for a polygon given as [[x,y],...]
function fillPoly(pts, c) {
  let minY = H;
  let maxY = 0;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = xs[k]; x <= xs[k + 1]; x++) setPix(x, y, c);
  }
}
function strokePoly(pts, c) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    line(a[0], a[1], b[0], b[1], c);
  }
}

// ---- text ----
function textW(s, sc) {
  return s.length * 6 * sc - sc;
}
function drawText(x, y, s, sc, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "#") fillRect(cx + col * sc, y + r * sc, sc, sc, c);
    cx += 6 * sc;
  }
}
function drawTextC(x, y, s, sc, c) {
  // centered on x
  drawText(x - Math.floor(textW(s, sc) / 2), y, s, sc, c);
}
// Greedy word wrap to maxChars per line; returns array of lines.
function wrap(s, maxChars) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---- PNG encoder (8-bit RGB, filter 0) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- world map (coarse equirectangular outlines, [lon, lat]) ----
const MAP = { x0: 8, x1: 1016, y0: 96, y1: 300 };
function project(lon, lat) {
  const x = Math.round(MAP.x0 + ((lon + 180) / 360) * (MAP.x1 - MAP.x0));
  const y = Math.round(MAP.y0 + ((78 - lat) / 136) * (MAP.y1 - MAP.y0));
  return [x, y];
}
function drawLand(poly) {
  const pts = poly.map((p) => project(p[0], p[1]));
  fillPoly(pts, LAND);
  strokePoly(pts, LANDLINE);
}

const NORTH_AMERICA = [
  [-168, 66], [-161, 58], [-153, 58], [-145, 60], [-135, 58], [-130, 54],
  [-125, 49], [-124, 40], [-120, 34], [-114, 29], [-110, 24], [-106, 22],
  [-100, 18], [-96, 16], [-92, 14], [-87, 13], [-83, 9], [-79, 8], [-78, 7],
  [-81, 10], [-84, 13], [-86, 16], [-88, 18], [-90, 21], [-91, 19], [-96, 19],
  [-97, 26], [-93, 30], [-89, 30], [-84, 30], [-81, 26], [-80, 32], [-76, 35],
  [-74, 39], [-70, 42], [-66, 44], [-61, 46], [-56, 48], [-55, 52], [-58, 55],
  [-62, 58], [-66, 60], [-72, 62], [-78, 62], [-82, 66], [-88, 66], [-94, 68],
  [-100, 69], [-110, 68], [-120, 69], [-130, 70], [-140, 70], [-150, 70],
  [-158, 71], [-164, 68], [-168, 66],
];
const GREENLAND = [
  [-45, 60], [-40, 64], [-32, 68], [-22, 70], [-20, 74], [-25, 78], [-35, 80],
  [-50, 80], [-58, 76], [-58, 70], [-52, 64], [-45, 60],
];
const SOUTH_AMERICA = [
  [-79, 9], [-77, 4], [-80, -3], [-81, -6], [-78, -11], [-74, -16], [-70, -20],
  [-70, -28], [-71, -34], [-72, -40], [-73, -46], [-74, -52], [-70, -54],
  [-66, -55], [-65, -47], [-62, -41], [-58, -35], [-53, -33], [-49, -28],
  [-41, -23], [-39, -17], [-35, -9], [-38, -5], [-43, -3], [-48, -1], [-51, 0],
  [-54, 2], [-58, 6], [-62, 9], [-66, 11], [-71, 12], [-76, 10], [-79, 9],
];
const EUROPE = [
  [-10, 36], [-9, 38], [-9, 43], [-4, 44], [-2, 44], [-1, 46], [-4, 48],
  [-1, 49], [1, 51], [3, 53], [6, 53], [8, 55], [8, 57], [10, 59], [12, 56],
  [14, 55], [18, 56], [21, 55], [23, 58], [21, 60], [24, 62], [26, 64],
  [29, 66], [30, 70], [33, 69], [40, 67], [44, 67], [48, 68], [53, 69],
  [58, 69], [63, 70], [68, 72], [72, 72], [75, 72], [72, 70], [68, 68],
  [64, 66], [60, 66], [56, 66], [52, 65], [48, 63], [44, 60], [41, 58],
  [38, 56], [36, 54], [34, 52], [32, 50], [30, 48], [28, 46], [29, 44],
  [28, 44], [25, 42], [23, 40], [23, 38], [26, 39], [28, 38], [30, 36],
  [33, 36], [36, 36], [36, 34], [34, 32], [32, 32], [30, 36], [27, 37],
  [24, 36], [22, 37], [20, 39], [19, 40], [17, 40], [15, 42], [13, 44],
  [10, 44], [8, 44], [6, 43], [3, 42], [1, 41], [0, 39], [-2, 37], [-5, 36],
  [-8, 37], [-10, 36],
];
const UK = [
  [-5, 50], [-3, 53], [-5, 55], [-3, 58], [-1, 57], [0, 53], [-1, 51], [-3, 50], [-5, 50],
];
const IRELAND = [[-10, 52], [-8, 55], [-6, 55], [-6, 52], [-8, 51], [-10, 52]];
const ICELAND = [[-22, 64], [-18, 66], [-14, 64], [-18, 63], [-22, 64]];
const AFRICA = [
  [-6, 35], [-10, 31], [-14, 28], [-16, 24], [-17, 20], [-17, 16], [-16, 12],
  [-14, 8], [-11, 7], [-8, 5], [-4, 5], [0, 6], [4, 6], [7, 4], [9, 4],
  [9, 0], [11, -2], [12, -5], [13, -9], [12, -14], [13, -18], [14, -22],
  [15, -27], [17, -29], [19, -34], [25, -34], [29, -30], [32, -28], [35, -24],
  [36, -20], [35, -16], [40, -15], [40, -11], [41, -7], [42, -3], [45, -1],
  [48, 0], [51, 2], [51, 8], [50, 11], [47, 11], [44, 11], [42, 13], [40, 15],
  [39, 18], [37, 21], [35, 24], [33, 27], [32, 30], [31, 31], [28, 31],
  [24, 32], [20, 32], [16, 32], [12, 33], [10, 34], [8, 35], [5, 37],
  [0, 36], [-3, 35], [-6, 35],
];
const MADAGASCAR = [
  [44, -16], [47, -15], [49, -14], [50, -16], [49, -20], [47, -24], [45, -25],
  [44, -22], [43, -18], [44, -16],
];
const ASIA_MAIN = [
  [28, 41], [30, 44], [33, 46], [36, 47], [39, 48], [41, 50], [44, 52],
  [46, 54], [48, 56], [50, 58], [52, 60], [54, 62], [56, 64], [58, 66],
  [60, 68], [63, 69], [66, 70], [69, 71], [72, 72], [75, 73], [78, 73],
  [81, 74], [84, 74], [87, 74], [90, 75], [93, 75], [96, 76], [99, 77],
  [102, 77], [105, 77], [108, 76], [111, 75], [114, 74], [117, 73], [120, 72],
  [123, 71], [126, 70], [129, 71], [132, 72], [135, 72], [138, 72], [141, 72],
  [144, 71], [147, 70], [150, 70], [153, 70], [156, 69], [159, 68], [162, 65],
  [162, 61], [160, 58], [158, 54], [156, 51], [153, 50], [150, 53], [147, 56],
  [144, 59], [142, 59], [141, 55], [140, 50], [138, 46], [136, 44], [134, 43],
  [132, 43], [130, 42], [128, 40], [126, 39], [124, 39], [122, 38], [120, 35],
  [119, 32], [121, 30], [120, 27], [118, 25], [116, 23], [114, 22], [112, 21],
  [110, 20], [108, 18], [106, 20], [105, 18], [106, 15], [108, 12], [106, 10],
  [104, 8], [103, 6], [101, 3], [100, 5], [99, 8], [98, 11], [97, 14],
  [96, 16], [94, 17], [92, 20], [91, 22], [89, 22], [87, 21], [86, 20],
  [84, 19], [82, 16], [80, 14], [80, 10], [80, 7], [78, 8], [76, 9],
  [75, 12], [74, 15], [73, 17], [72, 20], [70, 21], [68, 22], [66, 25],
  [64, 25], [62, 25], [60, 25], [58, 26], [56, 27], [54, 26], [52, 26],
  [50, 28], [48, 29], [46, 30], [44, 30], [42, 30], [40, 30], [38, 31],
  [36, 32], [36, 34], [34, 36], [32, 36], [30, 37], [28, 39], [28, 41],
];
const ARABIA = [
  [35, 31], [39, 31], [42, 29], [44, 29], [47, 29], [48, 29], [50, 28],
  [51, 26], [54, 24], [56, 26], [58, 23], [59, 22], [57, 19], [55, 17],
  [52, 15], [48, 14], [45, 12], [43, 12], [41, 15], [39, 19], [37, 23],
  [35, 27], [34, 29], [35, 31],
];
const SUMATRA = [
  [95, 5], [98, 3], [100, 0], [102, -3], [104, -5], [106, -6], [104, -5],
  [102, -2], [100, 1], [97, 4], [95, 5],
];
const JAVA = [
  [105, -6], [108, -7], [111, -7], [114, -8], [114, -9], [111, -8], [108, -7], [105, -6],
];
const BORNEO = [
  [109, 1], [111, 2], [114, 3], [117, 4], [118, 1], [117, -2], [115, -4],
  [112, -3], [110, -1], [109, 1],
];
const NEW_GUINEA = [
  [131, -1], [134, -2], [137, -3], [140, -4], [143, -6], [146, -7], [148, -9],
  [146, -8], [143, -7], [140, -5], [137, -3], [134, -2], [131, -1],
];
const PHILIPPINES = [
  [120, 18], [122, 17], [122, 14], [121, 13], [122, 10], [124, 11], [126, 10],
  [124, 8], [122, 7], [120, 9], [120, 14], [120, 18],
];
const JAPAN = [
  [130, 31], [132, 33], [134, 34], [136, 35], [138, 35], [140, 36], [141, 38],
  [141, 41], [140, 44], [142, 45], [143, 43], [141, 40], [140, 38], [138, 36],
  [136, 34], [134, 33], [131, 32], [130, 31],
];
const SRI_LANKA = [[80, 9], [81, 8], [80, 6], [79, 8], [80, 9]];
const TAIWAN = [[120, 22], [121, 23], [121, 25], [120, 24], [120, 22]];
const NZ = [
  [167, -45], [170, -42], [173, -40], [175, -38], [177, -38], [176, -40],
  [174, -41], [172, -43], [169, -46], [167, -45],
];
const AUSTRALIA = [
  [114, -22], [113, -26], [115, -32], [115, -35], [118, -35], [122, -34],
  [126, -32], [129, -32], [132, -32], [135, -35], [137, -35], [139, -37],
  [141, -38], [144, -38], [147, -39], [150, -37], [152, -33], [153, -29],
  [153, -26], [151, -24], [149, -21], [146, -19], [144, -16], [142, -14],
  [142, -11], [141, -13], [139, -15], [137, -12], [136, -12], [135, -15],
  [133, -12], [131, -12], [129, -14], [127, -15], [125, -14], [122, -16],
  [120, -19], [117, -20], [114, -22],
];
const LANDS = [
  NORTH_AMERICA, GREENLAND, SOUTH_AMERICA, EUROPE, UK, IRELAND, ICELAND,
  AFRICA, MADAGASCAR, ASIA_MAIN, ARABIA, SUMATRA, JAVA, BORNEO, NEW_GUINEA,
  PHILIPPINES, JAPAN, SRI_LANKA, TAIWAN, NZ, AUSTRALIA,
];
// Pinned stories: [story number, lon, lat, dx, dy] (dx/dy nudge the label circle).
const PINS = [
  [1, -122, 37, 0, 0],
  [2, 104, 1, -14, -12],
  [4, -77, 39, 0, 0],
  [5, 56.5, 26.5, 0, 0],
  [8, 30.5, 50.5, 0, 0],
  [9, 106.8, -6.2, 10, 8],
  [22, -0.1, 51.5, -12, -6],
  [28, 4.4, 50.8, 12, 6],
  [31, 21, 58.5, 0, 0],
  [33, 34.5, 31.5, 0, 0],
  [36, 32.5, 15.6, 0, 0],
  [38, 15.3, -4.3, 0, 0],
  [41, 77.2, 28.6, 0, 0],
  [42, 139.7, 35.7, 0, 0],
  [46, 77.6, 13, 0, 0],
  [50, 37.6, 55.7, 10, -8],
];

// ---- the day's news: 50 stories, all happened or first reported Mon 23 Nov 2026 ----
const LEAD = [
  "NVIDIA REINSTATES JENSEN HUANG AS CEO; SHARES JUMP ~30%",
  "US BLACKLISTS SINGAPORE'S MEGASPEED FOR NVIDIA AI CHIPS TO CHINA",
  "NYT: US INTELLIGENCE TRACKED ALICE HUANG'S CONTACTS WITH CHINA SPY",
  "DEMOCRATS CLINCH HOUSE MAJORITY, 258+ SEATS; 4 RACES UNCALLED",
  "IRAN SAYS MINES HIT 3 TANKERS IN HORMUZ; 2 SUPERTANKERS DISABLED",
  "TRUMP WARNS IRAN OF 'VERY TRAUMATIC' OUTCOME; WEIGHS 2ND CARRIER",
  "ISRAELI SETTLERS ATTACK ACROSS WEST BANK; EISENKOT: 'JEWISH TERRORISM'",
  "RUSSIAN STRIKES KILL 15+ NEAR KYIV; BOY PULLED ALIVE FROM RUBBLE",
  "INDONESIA CONFIRMS 24 DEAD IN CIKANDE SWEETS-FACTORY FIRE; ~30 MISSING",
  "ANTHROPIC: AI HELPED PROVE RIEMANN HYPOTHESIS; JUNK-RATING WARNING",
];
const INDEX = [
  ["NORTH AMERICA", [
    "FIFTH CIRCUIT 9-8: PROXY-VOTE QUORUM INVALID; BLOCKS PREGNANT WORKERS ACT IN TEXAS",
    "PENNSYLVANIA CONFIRMS 9TH MEASLES DEATH; US LOST ELIMINATION STATUS",
    "COURT UNSEALS REDACTED FILES ON RAID OF REP. ILHAN OMAR'S HOME",
    "APPEALS COURT GIVES TRUMP PATH TO ERASE HUSH-MONEY CONVICTION",
    "REP. JIMMY GOMEZ RESIGNS AFTER ETHICS PANEL FINDS MISCONDUCT EVIDENCE",
    "TRUMP DOJ SPEECH TARGETS NEWSOM, DEMOCRATS OVER VIOLENT CRIME",
    "DNC PLANS 12 DEBATES FOR 2028 PRIMARY, FIRST IN JUNE",
    "US UNVEILS PLANNED CITIZENSHIP-TEST, H-1B VISA CHANGES",
    "PRINCETON NEUROSCIENTIST FROM CHINA HELD BY ICE AT WASHINGTON AIRPORT",
    "COMMANDERS EDGE BENGALS 22-20 ON MONDAY NIGHT FOOTBALL; LIGHTS OUT 3 MIN",
    "COLTS CUT QB DANIEL JONES; ANTHONY RICHARDSON TO START",
  ]],
  ["EUROPE", [
    "UK PM BURNHAM DEFENDS EU RESET DEAL; 17BN POUNDS/YR BY 2040",
    "UK SET TO HOST 2035 WOMEN'S WORLD CUP",
    "MANCHESTER CO-OP LIVE EVACUATED AFTER UNKNOWN SUBSTANCE RELEASED",
    "NHS AI BREAST-SCREENING TRIAL INVITES ~700,000 WOMEN",
    "EURO-AREA INFLATION RISES TO 4.0% (EUROSTAT)",
    "IG METALL 24-HOUR WALKOUTS HIT GERMAN CAR, STEEL PLANTS",
    "EU BUDGET DRAFT: EUR 204BN TRIM + DIGITAL LEVY (COSTA)",
    "BRENTFORD 4-0 EVERTON; LEWIS-POTTER SCORES TWICE",
    "GERMANY TESTS SUICIDE DRONES, AI AIMING TOOL",
    "UKRAINE HITS 8 RUSSIAN OIL SITES IN A WEEK",
    "RUSSIAN CARGO SHIP DRONE-ATTACKED IN BALTIC; FINLAND SUSPECTS UKRAINE LINK",
  ]],
  ["MIDDLE EAST", [
    "GAZA DEATH TOLL RISES TO 74,742",
    "NETANYAHU PRESSES TRUMP ON IRAN STRIKE; 'READY TO GO ALONE' - HAARETZ",
    "EGYPT, TURKEY TALK ECONOMY, CALMING LIBYA (PHONE CALL)",
    "SUDAN GOVT DOWNS DRONES FROM ETHIOPIA AIMED AT KHARTOUM",
    "DRONE STRIKES HIT HOMES, UN BUILDING IN KHARTOUM",
  ]],
  ["AFRICA", [
    "WHO: FIGHTING DISRUPTS EBOLA RESPONSE IN CONGO; STAFF SHELTERED 24H+",
    "TWO NIGERIANS DIE SERVING IN RUSSIAN MILITARY (REPORTED MON)",
    "M23 ACCUSES DRC GOVT OF DRONE STRIKES ON MASISI, RUTSHURU VILLAGES",
  ]],
  ["ASIA", [
    "INDIA GIVES NEPAL $1.62BN FLOOD AID; MODI, SHAH OPEN RAIL LINK",
    "SOFTBANK TO INVEST $2BN IN INTEL",
    "ASIAN TECH SHARES SLIDE AS AI SELL-OFF DEEPENS; BEIJING, SEOUL, TAIPEI STEP IN",
    "BANGLADESH LAUNCHES MASS TYPHOID VACCINATION DRIVE",
    "INDIAN ARMY SEARCHES FOR SCORES MISSING AFTER HIMALAYAN FLOOD",
    "EX-INDIAN MP PRAJWAL REVANNA JAILED FOR LIFE FOR RAPE",
    "THAI-CAMBODIA BORDER FIGHTING ON HOLD AFTER TRUCE",
  ]],
  ["GLOBAL", [
    "BEPICOLOMBO ENTERS MERCURY ORBIT AFTER 8-YEAR JOURNEY",
    "WORLD BANK: INDIA'S EXTREME POVERTY DOWN TO 2.6% (METHODS QUESTIONED)",
    "LEAKED RECORDS PUT RUSSIAN WAR DEATHS AT 490K-700K+ (MEDUZA/MEDIAZONA)",
  ]],
];
// Stories deliberately left out: happened or first reported before 23 Nov (or after it).
const DATE_CHECK = [
  "COP31 CLIMATE TALKS COLLAPSE - SUN 22 NOV",
  "DELTA SYSTEM OUTAGE BEGAN - SUN 22 NOV",
  "RUSSIAN CORVETTE BLAST, BENGHAZI - PRE-DAWN 22 NOV",
  "LIVERPOOL 4-0 MAN UTD - SUN 22 NOV",
  "VERSTAPPEN WINS LAS VEGAS GP - SUN 22 NOV",
  "ALCARAZ WINS ATP FINALS - SUN 22 NOV",
  "NFL SUNDAY: 49ERS, LIONS, BILLS, CHIEFS WIN - 22 NOV",
  "HERBERT CONCUSSION PROTOCOL ANNOUNCED - SUN 22 NOV",
  "LEEDS 4-1 CHELSEA; FRANCE 45-17 ARGENTINA - 22 NOV",
  "TRUMP-XI-PUTIN SHENZHEN PEACE DECLARATION - THU 19 NOV",
  "GTA VI $3.79BN DAY-ONE SALES ANNOUNCED - FRI 20 NOV",
  "FBI NCIC DATABASE HACK FIRST REPORTED - FRI 20 NOV",
  "MILEY CYRUS MARRIES MAXX MORANDO - SAT 21 NOV",
  "S. KOREA EDUCATION MINISTER RESIGNS - SUN 22 NOV",
  "US-ISRAEL JOINT IRAN PLANS FIRST REPORTED - SAT 21 NOV",
  "NEPAL KOSHI EARTHQUAKE - TUE 24 NOV (AFTER THE DAY)",
  "SHENZHOU-24 CREW ANNOUNCED - TUE 24 NOV (AFTER THE DAY)",
  "ANTHROPIC IPO ITSELF - EARLIER IN NOV",
  "CIKANDE FACTORY FIRE BROKE OUT - SAT 21 NOV",
  "CHAPO ISIDRO / BAYER / NIGERIA BOAT / WAYMO - BEFORE 23 NOV",
];

// ---- layout ----
function bar(y, h, label, sc) {
  fillRect(8, y, W - 16, h, NAVY);
  drawText(16, y + Math.floor((h - 7 * sc) / 2), label, sc, WHITE);
}
// Numbered item; returns height used. Number in red, text in ink.
function numbered(x, y, num, text, sc, maxChars, lineH) {
  const numS = num + ".";
  const lines = wrap(text, maxChars);
  drawText(x, y, numS, sc, RED);
  const tx = x + textW(numS + " ", sc);
  for (let i = 0; i < lines.length; i++)
    drawText(i === 0 ? tx : x, y + i * lineH, lines[i], sc, INK);
  return lines.length * lineH + 1;
}

function main() {
  // Header
  fillRect(0, 0, W, 6, RED);
  drawTextC(W / 2, 14, "MONDAY 23 NOVEMBER 2026", 4, INK);
  drawTextC(W / 2, 50, "THE WORLD IN ONE DAY - 50 STORIES THAT MATTERED", 2, RED);
  drawTextC(W / 2, 70, "ALL EVENTS HAPPENED OR WERE FIRST REPORTED ON 23 NOVEMBER 2026", 1, GREY);
  hline(8, W - 9, 84, INK);

  // Map
  drawText(8, 90, "WHERE IT HAPPENED - 16 KEY STORIES PINNED", 1, GREY);
  for (const land of LANDS) drawLand(land);
  const labels = [
    ["NORTH AMERICA", -100, 56], ["SOUTH AMERICA", -58, -18], ["EUROPE", -28, 48],
    ["AFRICA", 20, -28], ["ASIA", 96, 52], ["AUSTRALIA", 134, -26],
  ];
  for (const [t, lon, lat] of labels) {
    const [lx, ly] = project(lon, lat);
    drawTextC(lx, ly, t, 1, GREY);
  }
  // frame
  hline(MAP.x0, MAP.x1, MAP.y0, GREY);
  hline(MAP.x0, MAP.x1, MAP.y1, GREY);
  vline(MAP.x0, MAP.y0, MAP.y1, GREY);
  vline(MAP.x1, MAP.y0, MAP.y1, GREY);
  for (const [n, lon, lat, dx, dy] of PINS) {
    const [px0, py0] = project(lon, lat);
    const cx = px0 + dx;
    const cy = py0 + dy;
    if (dx !== 0 || dy !== 0) line(px0, py0, cx, cy, RED);
    fillCircle(cx, cy, 10, WHITE);
    fillCircle(cx, cy, 9, RED);
    const lab = String(n);
    drawText(cx - Math.floor(textW(lab, 1) / 2), cy - 3, lab, 1, WHITE);
  }

  // Lead: 10 stories, 2 columns x 5 rows
  bar(308, 22, "THE LEAD - 10 STORIES THAT SHAPED THE DAY", 2);
  let ly = 338;
  const leadRowH = 34;
  for (let col = 0; col < 2; col++) {
    for (let r = 0; r < 5; r++) {
      const idx = col * 5 + r;
      const y = ly + r * leadRowH;
      numbered(col === 0 ? 16 : 524, y, idx + 1, LEAD[idx], 2, 37, 15);
    }
  }

  // Index: stories 11-50 grouped by region, 2 columns
  const idxTop = 526;
  bar(idxTop, 22, "THE DAY IN FULL - 50 STORIES", 2);
  let n = 11;
  const colX = [16, 524];
  const colY = [idxTop + 30, idxTop + 30];
  // left column: NORTH AMERICA + EUROPE; right: MIDDLE EAST + AFRICA + ASIA + GLOBAL
  const colGroups = [[0, 1], [2, 3, 4, 5]];
  for (let c = 0; c < 2; c++) {
    let y = colY[c];
    for (const g of colGroups[c]) {
      const [name, items] = INDEX[g];
      drawText(colX[c], y, name, 1, RED);
      y += 11;
      for (const item of items) {
        y += numbered(colX[c], y, n, item, 1, 77, 9);
        n++;
      }
      y += 1;
    }
    colY[c] = y;
  }
  const afterIndex = Math.max(colY[0], colY[1]) + 6;

  // DATE CHECK footer
  bar(afterIndex, 22, "DATE CHECK - LEFT OUT: NOT 23 NOVEMBER NEWS", 2);
  const dcTop = afterIndex + 28;
  let dcEnd = dcTop;
  for (let c = 0; c < 2; c++) {
    let y = dcTop;
    for (let r = 0; r < 10; r++) {
      const item = DATE_CHECK[c * 10 + r];
      drawText(colX[c], y, "X", 1, RED);
      drawText(colX[c] + 12, y, item, 1, GREY);
      y += 10;
    }
    dcEnd = Math.max(dcEnd, y);
  }
  const creditY = dcEnd + 6;
  drawTextC(W / 2, creditY, "SOURCES: REUTERS, AP, NYT, BBC, BLOOMBERG, CNA - ALL EVENTS 23 NOV 2026", 1, GREY);
  fillRect(0, creditY + 14, W, 6, RED);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outDir + "/entry.png", encodePNG());
}

main();
