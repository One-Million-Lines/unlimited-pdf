// Generates brand PNG icons (no external deps) for the extension.
// Draws a rounded crimson square with a white document glyph (folded corner +
// text lines), then encodes PNG. Mirrors the icon approach used across the
// One Million Lines extensions so no image tooling (sharp, etc.) is required.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/icons');

const RED = [228, 69, 58]; // #E4453A brand crimson
const WHITE = [255, 255, 255];

function makeIcon(size) {
  const buf = new Uint8Array(size * size * 4); // RGBA, transparent
  const r = size * 0.22; // corner radius

  const setPx = (x, y, [cr, cg, cb], a = 255) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = cr; buf[i + 1] = cg; buf[i + 2] = cb; buf[i + 3] = a;
  };

  // Rounded rectangle background.
  const inCorner = (x, y) => {
    const cx = Math.min(Math.max(x, r), size - 1 - r);
    const cy = Math.min(Math.max(y, r), size - 1 - r);
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inCorner(x, y)) setPx(x, y, RED, 255);
    }
  }

  // White document body with a folded top-right corner.
  const left = Math.round(size * 0.28);
  const right = Math.round(size * 0.72);
  const top = Math.round(size * 0.22);
  const bottom = Math.round(size * 0.78);
  const fold = Math.round(size * 0.16); // size of the folded corner
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      // Cut out the folded triangle in the top-right corner.
      const inFold = x > right - fold && y < top + fold && (right - x) + (y - top) < fold;
      if (inFold) continue;
      setPx(x, y, WHITE);
    }
  }

  // Text lines on the document (crimson) to suggest a page of content.
  const lineColor = RED;
  const lineLeft = left + Math.round(size * 0.06);
  const lineRight = right - Math.round(size * 0.06);
  const lineH = Math.max(1, Math.round(size * 0.045));
  const rows = [0.42, 0.55, 0.68];
  for (const rowFrac of rows) {
    const y0 = Math.round(size * rowFrac);
    const rr = lineRight - (rowFrac === 0.68 ? Math.round(size * 0.14) : 0);
    for (let y = y0; y < y0 + lineH; y++) {
      for (let x = lineLeft; x <= rr; x++) setPx(x, y, lineColor);
    }
  }

  return buf;
}

/* ----------------------------- PNG encoder ----------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(OUT, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, makeIcon(size));
  writeFileSync(resolve(OUT, `icon-${size}.png`), png);
  console.log(`icons/icon-${size}.png (${png.length} bytes)`);
}
console.log('Icons generated.');
