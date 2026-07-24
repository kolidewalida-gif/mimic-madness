/**
 * MimicVoiceMesh — live P2P voice for the Mimic mode (ISOLATED module).
 *
 * Turn-based karaoke = ONE singer → N listeners. The singer publishes their
 * mic track over WebRTC to every other player; listeners just receive & play.
 * Signaling rides the existing Supabase broadcast channel (offer/answer/ICE).
 *
 * Uses public STUN by default and automatically adds an optional TURN server
 * when VITE_TURN_URL(S), VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL are set.
 * For production, prefer short-lived TURN credentials delivered by a backend.
 */

type Signal =
  | { kind: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type SendFn = (kind: Signal['kind'], payload: DistributiveOmit<Signal, 'kind'>) => void;

const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  const urlsValue = import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (urlsValue && username && credential) {
    const urls = urlsValue.split(',').map((url: string) => url.trim()).filter(Boolean);
    if (urls.length) servers.push({ urls, username, credential });
  }
  return servers;
};

const ICE = buildIceServers();

export class MimicVoiceMesh {
  private pcs = new Map<string, RTCPeerConnection>();
  private selfId: string;
  private send: SendFn;
  private onRemoteStream: (stream: MediaStream) => void;
  private localStream: MediaStream | null = null;
  private role: 'singer' | 'listener' | null = null;
  private singerId: string | null = null;
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();

  constructor(selfId: string, send: SendFn, onRemoteStream: (stream: MediaStream) => void) {
    this.selfId = selfId;
    this.send = send;
    this.onRemoteStream = onRemoteStream;
  }

  private makePc(peerId: string): RTCPeerConnection {
    const existing = this.pcs.get(peerId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send('ice', { from: this.selfId, to: peerId, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => { if (e.streams[0]) this.onRemoteStream(e.streams[0]); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.pcs.delete(peerId);
      }
    };
    this.pcs.set(peerId, pc);
    return pc;
  }

  private queueIce(peerId: string, candidate: RTCIceCandidateInit) {
    const queued = this.pendingIce.get(peerId) ?? [];
    queued.push(candidate);
    this.pendingIce.set(peerId, queued);
  }

  private async flushIce(peerId: string, pc: RTCPeerConnection) {
    const queued = this.pendingIce.get(peerId) ?? [];
    this.pendingIce.delete(peerId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
    }
  }

  /** Singer: publish mic to every listener (we initiate the offers). */
  async startAsSinger(stream: MediaStream, listenerIds: string[]) {
    this.role = 'singer';
    this.singerId = this.selfId;
    this.localStream = stream;
    for (const id of listenerIds) {
      if (id === this.selfId) continue;
      try {
        const pc = this.makePc(id);
        stream.getAudioTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.send('offer', { from: this.selfId, to: id, sdp: offer });
      } catch { /* skip this peer */ }
    }
  }

  /** Listener: passive — just remember who the singer is and wait for offers. */
  startAsListener(singerId: string) {
    this.role = 'listener';
    this.singerId = singerId;
  }

  async handleSignal(sig: Signal) {
    if (sig.to !== this.selfId) return;
    try {
      if (sig.kind === 'offer') {
        // listener side: only accept an offer from the current singer
        if (this.role !== 'listener' || sig.from !== this.singerId) return;
        const pc = this.makePc(sig.from);
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        await this.flushIce(sig.from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send('answer', { from: this.selfId, to: sig.from, sdp: answer });
      } else if (sig.kind === 'answer') {
        const pc = this.pcs.get(sig.from);
        if (pc && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
          await this.flushIce(sig.from, pc);
        }
      } else if (sig.kind === 'ice') {
        const pc = this.pcs.get(sig.from);
        if (!pc || !pc.remoteDescription) {
          this.queueIce(sig.from, sig.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => undefined);
        }
      }
    } catch { /* ignore signaling errors */ }
  }

  stop() {
    this.pcs.forEach((pc) => { try { pc.close(); } catch { /* noop */ } });
    this.pcs.clear();
    this.pendingIce.clear();
    this.localStream = null;
    this.role = null;
    this.singerId = null;
  }
}
