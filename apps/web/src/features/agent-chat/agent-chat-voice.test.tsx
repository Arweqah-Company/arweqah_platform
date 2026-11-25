import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_KEYS, KEYS, launcher, open } from '../../../test/agent-chat-support';
import { server } from '../../../test/msw';
import { encodeWav } from './audio-wav';

/** The browser's sound: decoding gives a buffer of this length (seconds), or fails. */
const decoding = { seconds: 3, fails: false };
class FakeAudioContext {
  decodeAudioData = async () => {
    if (decoding.fails) throw new Error('cannot decode');
    return { duration: decoding.seconds };
  };
  close = async () => undefined;
}
class FakeOfflineAudioContext {
  destination = {};
  createBufferSource = () => ({ buffer: null, connect: () => undefined, start: () => undefined });
  startRendering = async () => ({ getChannelData: () => new Float32Array(160) });
}

/** The microphone: `MediaRecorder` hands one chunk to `ondataavailable` and then ends when stopped. */
const mic = { denied: false, stopped: vi.fn(), started: vi.fn() };
class FakeRecorder {
  static instance: FakeRecorder | null = null;
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(readonly stream: unknown) {
    FakeRecorder.instance = this;
  }
  start() {
    this.state = 'recording';
    mic.started();
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['raw'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

const sound = (name = 'note.m4a') => new File([new Uint8Array(100)], name, { type: 'audio/mp4' });
const heard = (text: string, truncated = false) => {
  let posted = 0;
  server.use(http.post('*/api/agent/transcribe', () => { posted += 1; return HttpResponse.json({ text, truncated }, { status: 201 }); }));
  return () => posted;
};
const openChat = async () => { fireEvent.click(await launcher()); return (await screen.findByLabelText('اكتب رسالتك')) as HTMLTextAreaElement; };
const chooseFile = async (file: File) => {
  fireEvent.click(await screen.findByRole('button', { name: 'إرفاق صورة' }));
  fireEvent.change(await screen.findByLabelText('اختر ملفًا صوتيًا'), { target: { files: [file] } });
};

describe('Speaking to the assistant (FR-181)', () => {
  beforeEach(() => {
    decoding.seconds = 3;
    decoding.fails = false;
    mic.denied = false;
    mic.stopped.mockReset();
    mic.started.mockReset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { if (mic.denied) throw new Error('NotAllowedError'); return { getTracks: () => [{ stop: mic.stopped }] }; } },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('FR-181: without agent.use_voice there is no microphone and a dropped sound is not sent for writing down', async () => {
    const posted = heard('x');
    open(KEYS);
    const box = await openChat();
    expect(screen.queryByRole('button', { name: 'التحدث إلى المساعد' })).not.toBeInTheDocument();
    fireEvent.drop(box, { dataTransfer: { files: [sound()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(posted()).toBe(0);
  });

  it('FR-181: a sound file is made a WAV, written down, and the text lands in the box to be read: nothing is sent to the assistant', async () => {
    const posted = heard('عايزة اعمل تذكرة');
    const sentToAssistant = vi.fn();
    server.use(http.post('*/api/agent/messages/stream', () => { sentToAssistant(); return HttpResponse.json({}); }));
    open(VOICE_KEYS);
    const box = await openChat();
    await chooseFile(sound());
    await waitFor(() => expect(box.value).toBe('عايزة اعمل تذكرة'));
    expect(posted()).toBe(1);
    expect(sentToAssistant).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeEnabled();
  });

  it('FR-181: the words are added after what is already typed, and a cut speech says so', async () => {
    heard('وصفحة مهامي لا تفتح', true);
    open(VOICE_KEYS);
    const box = await openChat();
    fireEvent.change(box, { target: { value: 'تذكرة جديدة' } });
    fireEvent.drop(box, { dataTransfer: { files: [sound()] } });
    await waitFor(() => expect(box.value).toBe('تذكرة جديدة وصفحة مهامي لا تفتح'));
    expect(await screen.findByText(/قُطع النص عند الحد/)).toBeInTheDocument();
  });

  it('FR-181: the microphone records (the clock shows, sending waits), and stopping it writes the speech down and gives the microphone back', async () => {
    const posted = heard('مرحبا');
    open(VOICE_KEYS);
    const box = await openChat();
    fireEvent.change(box, { target: { value: 'x' } });
    fireEvent.click(await screen.findByRole('button', { name: 'التحدث إلى المساعد' }));
    expect(await screen.findByText(/جارٍ التسجيل 0:0/)).toBeInTheDocument();
    expect(mic.started).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'إيقاف التسجيل' }));
    await waitFor(() => expect(box.value).toBe('x مرحبا'));
    expect(posted()).toBe(1);
    expect(mic.stopped).toHaveBeenCalled();
  });

  it('FR-181: a service that takes no sound is explained, and nothing lands in the box', async () => {
    server.use(http.post('*/api/agent/transcribe', () => HttpResponse.json({ code: 'AI_AUDIO_UNSUPPORTED', message: 'no' }, { status: 422 })));
    open(VOICE_KEYS);
    const box = await openChat();
    await chooseFile(sound());
    expect(await screen.findByText(/لا تقبل الصوت/)).toBeInTheDocument();
    expect(box.value).toBe('');
  });

  it('FR-181: a sound over five minutes, or one the browser cannot read, is refused before any request', async () => {
    const posted = heard('x');
    open(VOICE_KEYS);
    await openChat();
    decoding.seconds = 400;
    await chooseFile(sound('long.mp3'));
    expect(await screen.findByText(/أطول من 5 دقائق/)).toBeInTheDocument();
    decoding.seconds = 3;
    decoding.fails = true;
    fireEvent.change(screen.getByLabelText('اختر ملفًا صوتيًا'), { target: { files: [sound('odd.mp3')] } });
    expect(await screen.findByText(/لا يستطيع هذا المتصفح قراءة/)).toBeInTheDocument();
    expect(posted()).toBe(0);
  });

  it('FR-181: a blocked microphone says how to allow it', async () => {
    mic.denied = true;
    open(VOICE_KEYS);
    await openChat();
    fireEvent.click(await screen.findByRole('button', { name: 'التحدث إلى المساعد' }));
    expect(await screen.findByText(/الميكروفون محجوب/)).toBeInTheDocument();
  });

  it('FR-181: the WAV that is sent is 16-bit mono PCM with its length in the header', async () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2]), 16_000);
    const view = new DataView(await wav.arrayBuffer());
    expect(wav.size).toBe(44 + 5 * 2);
    expect(String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(i)))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(10);
    expect([44, 46, 48, 50, 52].map((at) => view.getInt16(at, true))).toEqual([0, 16384, -16383, 32767, -32767]);
  });
});
