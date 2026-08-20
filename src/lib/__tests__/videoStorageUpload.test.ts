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

  it('envoie le type MIME sans son paramètre de codec', async () => {
    /*
     * Régression vécue : « mime type audio/webm;codecs=opus is not supported ».
     * La liste blanche du bucket compare en égalité stricte, et `MediaRecorder`
     * produit toujours un type paramétré. Plus aucune imitation ne pouvait être
     * sauvegardée.
     */
    const recorded = new File([new Uint8Array(64)], 'imitation.webm', {
      type: 'audio/webm;codecs=opus',
    });

    await videoStorage.uploadVideo(recorded, clipData);

    expect(FakeXhr.instances).toHaveLength(1);
    expect(FakeXhr.instances[0].headers['content-type']).toBe('audio/webm');
  });

  it('normalise aussi le type paramétré de Firefox, espace incluse', async () => {
    // Firefox rend `audio/ogg; codecs=opus`, avec une espace après le
    // point-virgule : sans `trim()`, le type resterait invalide.
    const recorded = new File([new Uint8Array(64)], 'imitation.ogg', {
      type: 'audio/ogg; codecs=opus',
    });

    await videoStorage.uploadVideo(recorded, clipData);

    expect(FakeXhr.instances[0].headers['content-type']).toBe('audio/ogg');
  });

  it('retente dans la même classe de média si le type reste refusé', async () => {
    // Une liste blanche incomplète ne doit pas faire perdre un enregistrement.
    // Le repli reste de l'audio : étiqueter un son en vidéo casserait la lecture.
    let call = 0;
    const original = FakeXhr.prototype.send;
    FakeXhr.prototype.send = function patched(this: FakeXhr, body: unknown) {
      call += 1;
      FakeXhr.autoRespond = call === 1
        ? { status: 400, body: '{"message":"mime type audio/flac is not supported"}' }
        : { status: 200 };
      return original.call(this, body);
    };

    try {
      const recorded = new File([new Uint8Array(64)], 'imitation.flac', {
        type: 'audio/flac',
      });
      await expect(videoStorage.uploadVideo(recorded, clipData)).resolves.toMatchObject({
        id: 'clip-1',
      });
      expect(FakeXhr.instances).toHaveLength(2);
      expect(FakeXhr.instances[0].headers['content-type']).toBe('audio/flac');
      expect(FakeXhr.instances[1].headers['content-type']).toBe('audio/webm');
    } finally {
      FakeXhr.prototype.send = original;
    }
  });

  it('ne boucle pas quand le type refusé est déjà celui du repli', async () => {
    FakeXhr.autoRespond = {
      status: 400,
      body: '{"message":"mime type audio/webm is not supported"}',
    };
    const recorded = new File([new Uint8Array(64)], 'imitation.webm', {
      type: 'audio/webm',
    });

    await expect(videoStorage.uploadVideo(recorded, clipData)).rejects.toThrow(/not supported/);
    expect(FakeXhr.instances).toHaveLength(1);
  });

  it('nettoie le fichier envoyé si l’écriture en base échoue', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'colonne absente' } });

    await expect(videoStorage.uploadVideo(makeFile(), clipData)).rejects.toThrow(/colonne absente/);
    expect(mocks.storageRemove).toHaveBeenCalledWith(['player-1/clip-1.webm']);
  });
});

describe('extension déduite du conteneur', () => {
  let extensionForMimeType: typeof import('@/lib/videoStorageSupabase').extensionForMimeType;
  let baseMimeType: typeof import('@/lib/videoStorageSupabase').baseMimeType;

  beforeEach(async () => {
    const module = await import('@/lib/videoStorageSupabase');
    extensionForMimeType = module.extensionForMimeType;
    baseMimeType = module.baseMimeType;
  });

  it('retire les paramètres et normalise la casse', () => {
    expect(baseMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMimeType('audio/ogg; codecs=opus')).toBe('audio/ogg');
    expect(baseMimeType('AUDIO/MP4')).toBe('audio/mp4');
    expect(baseMimeType('')).toBe('');
  });

  it('suit le conteneur réel de chaque navigateur', () => {
    // Chrome, Firefox, Safari : trois conteneurs pour un même enregistrement.
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/ogg; codecs=opus')).toBe('ogg');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/wav')).toBe('wav');
    expect(extensionForMimeType('video/quicktime')).toBe('mov');
  });

  it('se rabat sur une extension par défaut pour un type inconnu', () => {
    expect(extensionForMimeType('audio/flac')).toBe('webm');
    expect(extensionForMimeType('', 'mp4')).toBe('mp4');
  });
});
