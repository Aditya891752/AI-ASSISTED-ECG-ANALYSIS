/** Generates a synthetic ECG-like waveform using a simplified analytic model
 * of the PQRST complex, repeated at the given heart rate. Not clinically
 * accurate — purely for demo/testing purposes when no real signal is on hand. */
export function generateDemoSignal(
  durationSec = 10,
  sampleRate = 360,
  bpm = 60,
  noiseLevel = 0.03
): number[] {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const beatIntervalSamples = Math.floor((60 / bpm) * sampleRate);
  const signal = new Array<number>(totalSamples).fill(0);

  const gaussian = (x: number, mu: number, sigma: number, amp: number) =>
    amp * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));

  for (let beatStart = 0; beatStart < totalSamples; beatStart += beatIntervalSamples) {
    for (let i = 0; i < beatIntervalSamples && beatStart + i < totalSamples; i++) {
      const t = i / sampleRate; // seconds into this beat
      let v = 0;
      v += gaussian(t, 0.08, 0.02, 0.1); // P wave
      v += gaussian(t, 0.16, 0.008, -0.15); // Q dip
      v += gaussian(t, 0.18, 0.01, 1.2); // R spike
      v += gaussian(t, 0.2, 0.008, -0.25); // S dip
      v += gaussian(t, 0.32, 0.04, 0.2); // T wave
      v += (Math.random() - 0.5) * noiseLevel;
      signal[beatStart + i] = v;
    }
  }

  return signal;
}

export function generateDemoChunk(
  sampleCount: number,
  sampleRate = 360,
  bpm = 60
): number[] {
  const durationSec = sampleCount / sampleRate;
  return generateDemoSignal(durationSec, sampleRate, bpm);
}
