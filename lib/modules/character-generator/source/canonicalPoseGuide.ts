import { deflateSync } from "node:zlib";

type Point = readonly [number, number];
type Colour = readonly [number, number, number];

const BASE_WIDTH = 768;
const BASE_HEIGHT = 1024;

const POINTS: readonly Point[] = [
  [384, 130],
  [384, 215],
  [306, 230],
  [240, 340],
  [180, 455],
  [462, 230],
  [528, 340],
  [588, 455],
  [348, 505],
  [340, 700],
  [334, 906],
  [420, 505],
  [428, 700],
  [434, 906],
  [370, 122],
  [398, 122],
  [354, 132],
  [414, 132],
] as const;

const LIMBS: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 5],
  [2, 3],
  [3, 4],
  [5, 6],
  [6, 7],
  [1, 8],
  [8, 9],
  [9, 10],
  [1, 11],
  [11, 12],
  [12, 13],
  [1, 0],
  [0, 14],
  [14, 16],
  [0, 15],
  [15, 17],
  [2, 16],
  [5, 17],
] as const;

const COLOURS: readonly Colour[] = [
  [255, 0, 0],
  [255, 85, 0],
  [255, 170, 0],
  [255, 255, 0],
  [170, 255, 0],
  [85, 255, 0],
  [0, 255, 0],
  [0, 255, 85],
  [0, 255, 170],
  [0, 255, 255],
  [0, 170, 255],
  [0, 85, 255],
  [0, 0, 255],
  [85, 0, 255],
  [170, 0, 255],
  [255, 0, 255],
  [255, 0, 170],
  [255, 0, 85],
  [255, 64, 64],
] as const;

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksumInput = Buffer.concat([typeBytes, Buffer.from(data)]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(checksumInput), 0);
  return Buffer.concat([length, typeBytes, Buffer.from(data), checksum]);
}

function setPixel(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  colour: Colour,
): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (y * width + x) * 3;
  pixels[offset] = colour[0];
  pixels[offset + 1] = colour[1];
  pixels[offset + 2] = colour[2];
}

function drawCircle(
  pixels: Uint8Array,
  width: number,
  height: number,
  centreX: number,
  centreY: number,
  radius: number,
  colour: Colour,
): void {
  const radiusSquared = radius * radius;

  for (let y = centreY - radius; y <= centreY + radius; y += 1) {
    for (let x = centreX - radius; x <= centreX + radius; x += 1) {
      const dx = x - centreX;
      const dy = y - centreY;
      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(pixels, width, height, x, y, colour);
      }
    }
  }
}

function drawLine(
  pixels: Uint8Array,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  colour: Colour,
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  for (let step = 0; step <= steps; step += 1) {
    const amount = steps === 0 ? 0 : step / steps;
    drawCircle(
      pixels,
      width,
      height,
      Math.round(from[0] + dx * amount),
      Math.round(from[1] + dy * amount),
      radius,
      colour,
    );
  }
}

export function createCanonicalAPoseGuide(
  width: number,
  height: number,
): Uint8Array {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 512 ||
    height < 512 ||
    width > 1536 ||
    height > 1536
  ) {
    throw new Error("Canonical pose guide dimensions must be 512–1536 pixels.");
  }

  const pixels = new Uint8Array(width * height * 3);
  const scaledPoints = POINTS.map(
    ([x, y]) =>
      [
        Math.round((x / BASE_WIDTH) * width),
        Math.round((y / BASE_HEIGHT) * height),
      ] as const,
  );
  const lineRadius = Math.max(4, Math.round(width / 128));
  const jointRadius = Math.max(6, Math.round(width / 96));

  LIMBS.forEach(([fromIndex, toIndex], index) => {
    drawLine(
      pixels,
      width,
      height,
      scaledPoints[fromIndex]!,
      scaledPoints[toIndex]!,
      lineRadius,
      COLOURS[index % COLOURS.length]!,
    );
  });

  scaledPoints.forEach((point, index) => {
    drawCircle(
      pixels,
      width,
      height,
      point[0],
      point[1],
      jointRadius,
      COLOURS[index % COLOURS.length]!,
    );
  });

  const rowSize = width * 3;
  const scanlines = Buffer.alloc((rowSize + 1) * height);

  for (let row = 0; row < height; row += 1) {
    const destination = row * (rowSize + 1);
    scanlines[destination] = 0;
    Buffer.from(pixels.buffer, row * rowSize, rowSize).copy(
      scanlines,
      destination + 1,
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk("IHDR", header),
      pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
      pngChunk("IEND", new Uint8Array()),
    ]),
  );
}
