/**
 * @param {string} codec
 * @returns {'pcm16' | 'g711_ulaw' | 'g711_alaw'}
 */
export function audioFormatForCodec(codec) {
  let audioFormat = 'pcm16';
  if (typeof window !== 'undefined') {
    const c = codec.toLowerCase();
    if (c === 'pcmu') audioFormat = 'g711_ulaw';
    else if (c === 'pcma') audioFormat = 'g711_alaw';
  }
  return audioFormat;
}

/**
 * Apply preferred codec on a peer connection's audio transceivers. Safe to call multiple times.
 * @param {RTCPeerConnection} pc
 * @param {string} codec
 */
export function applyCodecPreferences(pc, codec) {
  try {
    const caps = RTCRtpSender.getCapabilities?.('audio');
    if (!caps) return;

    const pref = caps.codecs.find(
      (c) => c.mimeType.toLowerCase() === `audio/${codec.toLowerCase()}`,
    );
    if (!pref) return;

    pc
      .getTransceivers()
      .filter((t) => t.sender && t.sender.track?.kind === 'audio')
      .forEach((t) => t.setCodecPreferences([pref]));
  } catch (err) {
    console.error('[codecUtils] applyCodecPreferences error', err);
  }
}