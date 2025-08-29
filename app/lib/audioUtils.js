// WAV conversion utilities

/**
 * Writes a string into a DataView at the given offset.
 * @param {DataView} view
 * @param {number} offset
 * @param {string} str
 */
export function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Converts a Float32Array to 16-bit PCM in a DataView.
 * @param {DataView} output
 * @param {number} offset
 * @param {Float32Array} input
 */
export function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

/**
 * Encodes a Float32Array as a WAV file.
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @returns {ArrayBuffer}
 */
export function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // file length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, "WAVE");
  // format chunk identifier
  writeString(view, 12, "fmt ");
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count - forcing mono here by averaging channels
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

/**
 * Converts a WebM audio blob to a WAV blob.
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function convertWebMBlobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const combined = new Float32Array(length);

  // Average channels to produce mono output
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      combined[i] += channelData[i];
    }
  }
  for (let i = 0; i < length; i++) {
    combined[i] /= numChannels;
  }
  const wavBuffer = encodeWAV(combined, audioBuffer.sampleRate);
  return new Blob([wavBuffer], { type: "audio/wav" });
}