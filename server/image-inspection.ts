/** Header dimensions prevent compressed images exhausting mobile texture memory. */
export function inspectImage(
  bytes: Buffer,
): { extension: string; width: number; height: number } | undefined {
  let extension = '',
    width = 0,
    height = 0;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (bytes.length < 33 || bytes.subarray(12, 16).toString() !== 'IHDR' || bytes.readUInt32BE(8) !== 13)
      throw new Error('PNG header hỏng.');
    extension = 'png';
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    extension = 'jpg';
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) throw new Error('JPEG marker hỏng.');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) throw new Error('JPEG segment hỏng.');
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (size < 8) throw new Error('JPEG dimensions hỏng.');
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += size;
    }
  } else if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') {
    extension = 'webp';
    if (bytes.length < 25 || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('WebP hỏng.');
    const tag = bytes.subarray(12, 16).toString();
    if (tag === 'VP8X' && bytes.length >= 30) {
      width = 1 + bytes.readUIntLE(24, 3);
      height = 1 + bytes.readUIntLE(27, 3);
    } else if (tag === 'VP8L' && bytes[20] === 0x2f) {
      const bits = bytes.readUInt32LE(21);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
    } else if (
      tag === 'VP8 ' &&
      bytes.length >= 30 &&
      bytes.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))
    ) {
      width = bytes.readUInt16LE(26) & 0x3fff;
      height = bytes.readUInt16LE(28) & 0x3fff;
    }
  } else return;
  if (!width || !height || width > 4096 || height > 4096 || width * height > 2048 * 2048)
    throw new Error('Texture tối đa 4 triệu pixel, cạnh tối đa 4096.');
  return { extension, width, height };
}
