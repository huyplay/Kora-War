/** Only short PCM WAV or Vorbis/Opus Ogg clips are accepted; no executable containers. */
export function inspectAudio(
  bytes: Buffer,
): { extension: string; duration: number; sampleRate: number; channels: number } | undefined {
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE') {
    if (bytes.length < 44 || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('WAV hỏng.');
    let sampleRate = 0,
      channels = 0,
      byteRate = 0,
      dataSize = 0,
      blockAlign = 0;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const tag = bytes.subarray(offset, offset + 4).toString();
      const size = bytes.readUInt32LE(offset + 4),
        start = offset + 8;
      if (start + size > bytes.length) throw new Error('WAV chunk hỏng.');
      if (tag === 'fmt ') {
        if (size < 16 || ![1, 3].includes(bytes.readUInt16LE(start)))
          throw new Error('Chỉ nhận WAV PCM/float.');
        channels = bytes.readUInt16LE(start + 2);
        sampleRate = bytes.readUInt32LE(start + 4);
        byteRate = bytes.readUInt32LE(start + 8);
        const bits = bytes.readUInt16LE(start + 14);
        blockAlign = bytes.readUInt16LE(start + 12);
        if (
          ![8, 16, 24, 32].includes(bits) ||
          (bytes.readUInt16LE(start) === 3 && bits !== 32) ||
          blockAlign !== (channels * bits) / 8 ||
          byteRate !== sampleRate * blockAlign
        )
          throw new Error('Định dạng WAV không hợp lệ.');
      }
      if (tag === 'data') dataSize += size;
      offset = start + size + (size % 2);
    }
    if (!blockAlign || dataSize % blockAlign !== 0) throw new Error('WAV data không hợp lệ.');
    const duration = dataSize / byteRate;
    validate(duration, sampleRate, channels);
    return { extension: 'wav', duration, sampleRate, channels };
  }
  if (bytes.subarray(0, 4).toString() !== 'OggS') return;
  let offset = 0,
    lastGranule = 0n,
    sampleRate = 0,
    channels = 0,
    preSkip = 0;
  let serial: number | undefined;
  while (offset < bytes.length) {
    if (
      offset + 27 > bytes.length ||
      bytes.subarray(offset, offset + 4).toString() !== 'OggS' ||
      bytes[offset + 4] !== 0
    )
      throw new Error('Ogg page hỏng.');
    const stream = bytes.readUInt32LE(offset + 14);
    if (serial !== undefined && stream !== serial) throw new Error('Chỉ nhận Ogg một stream.');
    serial = stream;
    const segments = bytes[offset + 26],
      start = offset + 27 + segments;
    if (start > bytes.length) throw new Error('Ogg segment hỏng.');
    let size = 0;
    for (let i = 0; i < segments; i++) size += bytes[offset + 27 + i];
    if (start + size > bytes.length) throw new Error('Ogg payload hỏng.');
    if (offset === 0) {
      if (size >= 16 && bytes[start] === 1 && bytes.subarray(start + 1, start + 7).toString() === 'vorbis') {
        channels = bytes[start + 11];
        sampleRate = bytes.readUInt32LE(start + 12);
      } else if (size >= 19 && bytes.subarray(start, start + 8).toString() === 'OpusHead') {
        channels = bytes[start + 9];
        sampleRate = 48000;
        preSkip = bytes.readUInt16LE(start + 10);
      } else throw new Error('Chỉ nhận Ogg Vorbis/Opus.');
    }
    const granule = bytes.readBigUInt64LE(offset + 6);
    if (granule !== 0xffffffffffffffffn) lastGranule = granule;
    offset = start + size;
  }
  const duration = (Number(lastGranule) - preSkip) / sampleRate;
  validate(duration, sampleRate, channels);
  return { extension: 'ogg', duration, sampleRate, channels };
}
function validate(duration: number, rate: number, channels: number) {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 15 ||
    rate < 8000 ||
    rate > 96000 ||
    ![1, 2].includes(channels)
  )
    throw new Error('SFX tối đa 15 giây, mono/stereo, 8–96 kHz.');
}
