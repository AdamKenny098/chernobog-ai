const TARGET_SAMPLE_RATE = 16_000;

export interface WavRecorderStartOptions {
  onAudioFrame?: (
    samples: Float32Array,
    sampleRate: number,
  ) => void;
}

function mergeBuffers(
  chunks: Float32Array[],
): Float32Array {
  const length = chunks.reduce(
    (total, chunk) => total + chunk.length,
    0,
  );
  const merged = new Float32Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function resampleLinear(
  input: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (
    sourceRate === targetRate ||
    input.length === 0
  ) {
    return input;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(
    1,
    Math.round(input.length / ratio),
  );
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * ratio;
    const left = Math.floor(sourcePosition);
    const right = Math.min(
      left + 1,
      input.length - 1,
    );
    const fraction = sourcePosition - left;
    output[index] =
      input[left] * (1 - fraction) +
      input[right] * fraction;
  }

  return output;
}

function writeAscii(
  view: DataView,
  offset: number,
  value: string,
): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(
      offset + index,
      value.charCodeAt(index),
    );
  }
}

function encodePcm16Wav(
  samples: Float32Array,
  sampleRate: number,
): Blob {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(
    28,
    sampleRate * bytesPerSample,
    true,
  );
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(
      -1,
      Math.min(1, sample),
    );
    view.setInt16(
      offset,
      clamped < 0
        ? clamped * 0x8000
        : clamped * 0x7fff,
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], {
    type: "audio/wav",
  });
}

export class WavRecorder {
  private readonly chunks: Float32Array[] = [];
  private stopped = false;

  private constructor(
    private readonly stream: MediaStream,
    private readonly context: AudioContext,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly processor: ScriptProcessorNode,
    private readonly sink: GainNode,
    private readonly options: WavRecorderStartOptions,
  ) {}

  static async start(
    stream: MediaStream,
    options: WavRecorderStartOptions = {},
  ): Promise<WavRecorder> {
    const context = new AudioContext();
    const source =
      context.createMediaStreamSource(stream);
    const processor =
      context.createScriptProcessor(4096, 1, 1);
    const sink = context.createGain();

    sink.gain.value = 0;
    source.connect(processor);
    processor.connect(sink);
    sink.connect(context.destination);

    const recorder = new WavRecorder(
      stream,
      context,
      source,
      processor,
      sink,
      options,
    );

    processor.onaudioprocess = (event) => {
      if (recorder.stopped) {
        return;
      }

      const input =
        event.inputBuffer.getChannelData(0);
      const frame = new Float32Array(input);
      recorder.chunks.push(frame);
      recorder.options.onAudioFrame?.(
        frame,
        context.sampleRate,
      );
    };

    await context.resume();
    return recorder;
  }

  retainRecentAudio(milliseconds: number): void {
    if (this.stopped) {
      return;
    }

    const keepSamples = Math.max(
      0,
      Math.round(
        this.context.sampleRate *
          (Math.max(0, milliseconds) / 1_000),
      ),
    );

    if (keepSamples === 0) {
      this.chunks.length = 0;
      return;
    }

    const retained: Float32Array[] = [];
    let remaining = keepSamples;

    for (
      let index = this.chunks.length - 1;
      index >= 0 && remaining > 0;
      index -= 1
    ) {
      const chunk = this.chunks[index];

      if (chunk.length <= remaining) {
        retained.unshift(chunk);
        remaining -= chunk.length;
        continue;
      }

      retained.unshift(
        chunk.slice(chunk.length - remaining),
      );
      remaining = 0;
    }

    this.chunks.length = 0;
    this.chunks.push(...retained);
  }

  async stop(): Promise<Blob> {
    if (this.stopped) {
      throw new Error(
        "Audio recorder has already stopped.",
      );
    }

    this.stopped = true;
    this.processor.onaudioprocess = null;
    this.source.disconnect();
    this.processor.disconnect();
    this.sink.disconnect();

    for (const track of this.stream.getTracks()) {
      track.stop();
    }

    const sourceRate = this.context.sampleRate;
    await this.context.close();

    const merged = mergeBuffers(this.chunks);
    const resampled = resampleLinear(
      merged,
      sourceRate,
      TARGET_SAMPLE_RATE,
    );

    return encodePcm16Wav(
      resampled,
      TARGET_SAMPLE_RATE,
    );
  }

  async cancel(): Promise<void> {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    this.processor.onaudioprocess = null;

    try {
      this.source.disconnect();
      this.processor.disconnect();
      this.sink.disconnect();
    } catch {
      // Best-effort browser cleanup.
    }

    for (const track of this.stream.getTracks()) {
      track.stop();
    }

    await this.context.close().catch(() => undefined);
  }
}
