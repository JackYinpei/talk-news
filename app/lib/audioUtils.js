
/**
 * Converts a base64 string to a Uint8Array.
 * @param {string} base64 - The base64 string to convert.
 * @returns {Uint8Array} The resulting byte array.
 */
export function base64ToBytes(base64) {
    const binaryString = window.atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decodes audio data from a byte array.
 * @param {Uint8Array} bytes - The audio data bytes.
 * @param {AudioContext} audioContext - The AudioContext to use for decoding.
 * @returns {Promise<AudioBuffer>} The decoded audio buffer.
 */
export async function decodeAudioData(bytes, audioContext) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return await audioContext.decodeAudioData(buffer);
}

/**
 * Creates a Blob from floating point PCM data.
 * Configured for 16kHz Mono 16-bit PCM which is typical for Gemini real-time input.
 * @param {Float32Array} float32Array - The PCM data.
 * @returns {Blob}
 */
export function createPcmBlob(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return new Blob([pcm16], { type: 'audio/pcm;rate=16000' });
}
