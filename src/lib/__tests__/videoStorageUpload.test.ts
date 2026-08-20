import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  storageUpload: vi.fn(),
  storageRemove: vi.fn(),
  insert: vi.fn(),
  capturePoster: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    storage: {
      from: () => ({
        upload: mocks.storageUpload,
        remove: mocks.storageRemove,
      }),
    },
    from: () => ({ insert: mocks.insert }),
  },
}));

vi.mock('@/lib/videoPoster', () => ({
  captureVideoPoster: mocks.capturePoster,
}));

/** XHR minimal, piloté à la main pour observer les en-têtes et les issues. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  static autoRespond: { status: number; body?: string } | null = { status: 200 };
  static autoFail: 'error' | 'timeout' | 'abort' | null = null;

  method = '';
  url = '';
  timeout = 0;
  status = 0;
  responseText = '';
  headers: Record<string, string> = {};
  upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  sentBody: unknown = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.sentBody = body;
    if (FakeXhr.autoFail) {
      const handler = {
        error: () => this.onerror?.(),
        timeout: () => this.ontimeout?.(),
        abort: () => this.onabort?.(),
      }[FakeXhr.autoFail];
      queueMicrotask(() => handler());
      return;
    }
    if (FakeXhr.autoRespond) {
      this.status = FakeXhr.autoRespond.status;
      this.responseText = FakeXhr.autoRespond.body ?? '';
      queueMicrotask(() => this.onload?.());
    }
  }
}

const clipData = {
  id: 'clip-1',
  name: 'imitation',
  playerId: 'player-1',
  playerName: 'Ada',
  startTime: 0,
  endTime: 0,
  isMuted: false,
  lobbyId: 'lobby-1',
  roundNumber: 2,
};

let videoStorage: typeof import('@/lib/videoStorageSupabase').videoStorage;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  FakeXhr.instances = [];
  FakeXhr.autoRespond = { status: 200 };
  FakeXhr.autoFail = null;
  vi.stubGlobal('XMLHttpRequest', FakeXhr as unknown as typeof XMLHttpRequest);

  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.storageUpload.mockResolvedValue({ error: null });
  mocks.storageRemove.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
  // La vignette est optionnelle : on la neutralise pour isoler l'envoi.
  mocks.capturePoster.mockResolvedValue(null);

  videoStorage = (await import('@/lib/videoStorageSupabase')).videoStorage;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const makeFile = (bytes = 1024) =>
  new File([new Uint8Array(bytes)], 'imitation.webm', { type: 'audio/webm' });

describe('envoi d’un clip', () => {
  it('aboutit même quand le verrou d’authentification refuse la session', async () => {
    /*
     * Régression vécue en production : « Acquiring an exclusive Navigator
     * LockManager lock "lock:sb-…-auth-token" immediately failed ». Ce rejet
     * faisait échouer l'envoi avant le moindre octet, et comme le bouton
     * « Soumettre » d'une imitation n'apparaît qu'après un envoi réussi, le
     * joueur ne pouvait plus soumettre du tout.
     */
    mocks.getSession.mockRejectedValue(
      new Error('Acquiring an exclusive Navigator LockManager lock immediately failed'),
    );

    const clip = await videoStorage.uploadVideo(makeFile(), clipData);

    expect(clip.id).toBe('clip-1');
    expect(clip.storagePath).toBe('player-1/clip-1.webm');
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    // Le repli utilise la clé publiable, comme le ferait le SDK sans session.
    expect(FakeXhr.instances).toHaveLength(1);
    expect(FakeXhr.instances[0].headers.authorization).toMatch(/^Bearer .+/);
  });

  it('aboutit quand la session ne se résout jamais', async () => {
    vi.useFakeTimers();
    // Verrou détenu par un autre onglet : la promesse reste pendante.
    mocks.getSession.mockReturnValue(new Promise(() => {}));

    const promise = videoStorage.uploadVideo(makeFile(), clipData);
    await vi.advanceTimersByTimeAsync(3_500);

    await expect(promise).resolves.toMatchObject({ id: 'clip-1' });
  });

  it('utilise le jeton de session quand il est disponible', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'jeton-de-session' } },
    });

    await videoStorage.uploadVideo(makeFile(), clipData);

    expect(FakeXhr.instances[0].headers.authorization).toBe('Bearer jeton-de-session');
  });

  it('borne l’envoi dans le temps au lieu de rester bloqué', async () => {
    // Sans `xhr.timeout`, un envoi bloqué ne se terminait jamais, et
    // l'enregistreur d'imitation restait en chargement sans message.
    await videoStorage.uploadVideo(makeFile(4 * 1024 * 1024), clipData);

    expect(FakeXhr.instances[0].timeout).toBeGreaterThan(0);
  });

  it('retente via le SDK quand le transport échoue sans réponse', async () => {
    FakeXhr.autoFail = 'timeout';

    await expect(videoStorage.uploadVideo(makeFile(), clipData)).resolves.toMatchObject({
      id: 'clip-1',
    });
    expect(mocks.storageUpload).toHaveBeenCalledTimes(1);
  });

  it('ne retente pas via le SDK sur un refus du serveur', async () => {
    // Un 403 serait refusé à l'identique : retenter ne ferait que doubler
    // l'attente avant d'annoncer l'échec.
    FakeXhr.autoRespond = { status: 403, body: '{"message":"new row violates policy"}' };

    await expect(videoStorage.uploadVideo(makeFile(), clipData)).rejects.toThrow(
      /new row violates policy/,
    );
    expect(mocks.storageUpload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rapporte la progression des octets transmis', async () => {
    const seen: number[] = [];
    FakeXhr.autoRespond = null;

    const promise = videoStorage.uploadVideo(makeFile(1000), clipData, (progress) => {
      seen.push(progress.ratio);
    });

    // La requête n'existe qu'après la résolution du jeton.
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const xhr = FakeXhr.instances[0];
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 500, total: 1000 } as ProgressEvent);
    xhr.status = 200;
    xhr.onload?.();

    await promise;
    expect(seen[0]).toBeCloseTo(0.5);
    expect(seen.at(-1)).toBe(1);
  });

  it('refuse un fichier trop lourd avant toute requête', async () => {
    const tooBig = { size: 500 * 1024 * 1024, name: 'gros.mp4', type: 'video/mp4' } as File;

    await expect(videoStorage.uploadVideo(tooBig, clipData)).rejects.toMatchObject({
      name: 'UploadTooLargeError',
    });
    expect(FakeXhr.instances).toHaveLength(0);
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('nettoie le fichier envoyé si l’écriture en base échoue', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'colonne absente' } });

    await expect(videoStorage.uploadVideo(makeFile(), clipData)).rejects.toThrow(/colonne absente/);
    expect(mocks.storageRemove).toHaveBeenCalledWith(['player-1/clip-1.webm']);
  });
});
