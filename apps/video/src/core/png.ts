// Minimal PNG reading and writing, for QA pixel sampling and contact sheets.
// Reads 8-bit RGB/RGBA/grey, non-interlaced (what Chrome screenshots are).
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

export interface Png {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array;
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

export function readPng(file: string): Png {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47)
    throw new Error(`${file} is not a PNG`);
  let width = 0,
    height = 0,
    channels = 0;
  const idat: Buffer[] = [];
  for (let o = 8; o < buf.length;) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString("ascii", o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      channels = CHANNELS[body[9]!] ?? 0;
      if (body[8] !== 8 || !channels || body[12] !== 0)
        throw new Error(
          `${file}: unsupported PNG (8-bit, non-interlaced only)`,
        );
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const row = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? data[y * stride + x - channels]! : 0;
      const b = y ? data[(y - 1) * stride + x]! : 0;
      const c = x >= channels && y ? data[(y - 1) * stride + x - channels]! : 0;
      const v = raw[row + x]!;
      let p = 0;
      if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a),
          pb = Math.abs(q - b),
          pc = Math.abs(q - c);
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * stride + x] = (v + p) & 255;
    }
  }
  return { width, height, channels, data };
}

/** Median relative luminance (0–1) of a rectangle. */
export function medianLuma(
  png: Png,
  r: { x: number; y: number; w: number; h: number },
): number {
  const out: number[] = [];
  const x0 = Math.max(0, Math.floor(r.x)),
    x1 = Math.min(png.width, Math.ceil(r.x + r.w));
  const y0 = Math.max(0, Math.floor(r.y)),
    y1 = Math.min(png.height, Math.ceil(r.y + r.h));
  for (let y = y0; y < y1; y += 2)
    for (let x = x0; x < x1; x += 2) {
      const i = (y * png.width + x) * png.channels;
      const [R, G, B] =
        png.channels >= 3
          ? [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!]
          : [png.data[i]!, png.data[i]!, png.data[i]!];
      out.push((0.2126 * R + 0.7152 * G + 0.0722 * B) / 255);
    }
  out.sort((a, b) => a - b);
  return out[Math.floor(out.length / 2)] ?? 0;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Writes an 8-bit RGB PNG. */
export function writePng(
  file: string,
  width: number,
  height: number,
  rgb: Uint8Array,
) {
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++)
    Buffer.from(rgb.subarray(y * width * 3, (y + 1) * width * 3)).copy(
      raw,
      y * (width * 3 + 1) + 1,
    );
  const chunk = (type: string, body: Buffer) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, "ascii");
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** Tiles PNGs (box-downscaled to `cellWidth`) into one contact sheet, in order. */
export function contactSheet(
  files: string[],
  out: string,
  cellWidth = 270,
  cols = 5,
) {
  const imgs = files.map(readPng);
  const first = imgs[0];
  if (!first) throw new Error("no stills for the sheet");
  const k = first.width / cellWidth;
  const cw = cellWidth;
  const ch = Math.round(first.height / k);
  const gap = 6;
  const rows = Math.ceil(imgs.length / cols);
  const W = Math.min(cols, imgs.length) * (cw + gap) + gap;
  const H = rows * (ch + gap) + gap;
  const rgb = new Uint8Array(W * H * 3).fill(24);
  imgs.forEach((img, n) => {
    const ox = gap + (n % cols) * (cw + gap);
    const oy = gap + Math.floor(n / cols) * (ch + gap);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const acc = [0, 0, 0];
        let cnt = 0;
        for (
          let sy = Math.floor(y * k);
          sy < Math.min(img.height, Math.floor((y + 1) * k));
          sy++
        )
          for (
            let sx = Math.floor(x * k);
            sx < Math.min(img.width, Math.floor((x + 1) * k));
            sx++
          ) {
            const i = (sy * img.width + sx) * img.channels;
            for (let c = 0; c < 3; c++)
              acc[c]! += img.data[i + (img.channels >= 3 ? c : 0)]!;
            cnt++;
          }
        const o = ((oy + y) * W + ox + x) * 3;
        for (let c = 0; c < 3; c++) rgb[o + c] = cnt ? acc[c]! / cnt : 0;
      }
  });
  writePng(out, W, H, rgb);
}
