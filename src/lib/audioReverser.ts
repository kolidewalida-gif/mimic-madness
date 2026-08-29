/**
 * Audio Reverser Utility
 * Uses Web Audio API to reverse audio samples
 */

type ReverseAudioResult = {
  reversedBlob: Blob;
  durationSeconds: number;
};

const decodeAudioBlob = async (
  audioContext: AudioContext,
  audioBlob: Blob
): Promise<AudioBuffer> => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
};

/**
 * Reverses an audio Blob and returns both the reversed WAV Blob and a reliable duration.
 * Uses decodeAudioData which is generally more reliable than HTMLAudio metadata for blob URLs.
 */
/**
 * Fréquence d'échantillonnage du fichier inversé.
 *
 * Le WAV produit ici n'est pas un master : il existe pour être écouté une fois
 * et imité. À 48 kHz stéréo — ce que rend un micro décodé sans consigne — huit
 * secondes pèsent 1,5 Mo de PCM non compressé, qu'il faut ensuite envoyer sur le
 * lien montant du joueur. C'est ce fichier qui faisait durer l'envoi.
 *
 * 24 kHz mono garde 12 kHz de bande utile, largement au-dessus de la voix, et
 * divise le poids par quatre.
 */
const REVERSED_SAMPLE_RATE = 24_000;

/**
 * Contexte de décodage à fréquence imposée quand le navigateur l'accepte.
 *
 * `decodeAudioData` ré-échantillonne vers la fréquence du contexte : demander
 * 24 kHz ici évite d'allouer puis de parcourir un tampon deux fois plus grand.
 * Certains navigateurs refusent une fréquence hors de leur plage matérielle, on
 * retombe alors sur le contexte par défaut — le résultat reste correct, il est
 * juste plus lourd.
 */
const createDecodeContext = (): AudioContext => {
  try {
    return new AudioContext({ sampleRate: REVERSED_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
};

export const reverseAudioBufferWithInfo = async (audioBlob: Blob): Promise<ReverseAudioResult> => {
  const audioContext = createDecodeContext();

  try {
    const audioBuffer = await decodeAudioBlob(audioContext, audioBlob);
    const durationSeconds = audioBuffer.duration;

    // Create a new buffer with the same properties
    const reversedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Reverse each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = reversedBuffer.getChannelData(channel);

      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[inputData.length - 1 - i];
      }
    }

    // Encode the reversed buffer back to a blob
    const reversedBlob = await encodeAudioBuffer(reversedBuffer);

    return { reversedBlob, durationSeconds };
  } finally {
    await audioContext.close();
  }
};

export const reverseAudioBuffer = async (audioBlob: Blob): Promise<Blob> => {
  const { reversedBlob } = await reverseAudioBufferWithInfo(audioBlob);
  return reversedBlob;
};

/**
 * Encode un AudioBuffer en WAV **mono**.
 *
 * La source est un micro : ses canaux portent le même signal, et écrire les deux
 * doublait le poids du fichier pour rien. S'il y en a plusieurs, on les
 * moyenne — c'est un repli correct, pas une perte d'information utile.
 */
const encodeAudioBuffer = async (buffer: AudioBuffer): Promise<Blob> => {
  const sourceChannels = buffer.numberOfChannels;
  const frames = buffer.length;
  const length = frames * 2; // mono, 16 bits
  const sampleRate = buffer.sampleRate;

  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < sourceChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    let sample = 0;
    for (let channel = 0; channel < sourceChannels; channel++) {
      sample += channels[channel][i];
    }
    sample = Math.max(-1, Math.min(1, sample / sourceChannels));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Creates a playable audio URL from a blob
 */
export const createAudioUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};

/**
 * Downloads audio from a URL and returns as Blob
 */
export const fetchAudioBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  return await response.blob();
};

/**
 * Gets the duration of an audio blob in seconds
 */
export const getAudioDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Failed to load audio'));
    };
  });
};
