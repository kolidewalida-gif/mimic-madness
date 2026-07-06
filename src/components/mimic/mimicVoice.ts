/**
 * MimicVoiceMesh — live P2P voice for the Mimic mode (ISOLATED module).
 *
 * Turn-based karaoke = ONE singer → N listeners. The singer publishes their
 * mic track over WebRTC to every other player; listeners just receive & play.
 * Signaling rides the existing Supabase broadcast channel (offer/answer/ICE).
 *
 * Honest limitation: uses public STUN only (no TURN), so players behind
 * symmetric NAT may fail to connect. This class is self-contained so it can be
 * swapped for LiveKit / a TURN-backed setup later without touching the UI.
 */

type Signal =
  | { kind: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type SendFn = (kind: Signal['kind'], payload: DistributiveOmit<Signal, 'kind'>) => void;

const ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class MimicVoiceMesh {
  private pcs = new Map<string, RTCPeerConnection>();
  private selfId: string;
  private send: SendFn;
  private onRemoteStream: (stream: MediaStream) => void;
  private localStream: MediaStream | null = null;
  private role: 'singer' | 'listener' | null = null;
  private singerId: string | null = null;

  constructor(selfId: string, send: SendFn, onRemoteStream: (stream: MediaStream) => void) {
    this.selfId = selfId;
    this.send = send;
    this.onRemoteStream = onRemoteStream;
  }

  private makePc(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send('ice', { from: this.selfId, to: peerId, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => { if (e.streams[0]) this.onRemoteStream(e.streams[0]); };
    this.pcs.set(peerId, pc);
    return pc;
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
        const pc = this.pcs.get(sig.from) ?? this.makePc(sig.from);
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send('answer', { from: this.selfId, to: sig.from, sdp: answer });
      } else if (sig.kind === 'answer') {
        const pc = this.pcs.get(sig.from);
        if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
      } else if (sig.kind === 'ice') {
        const pc = this.pcs.get(sig.from);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {});
      }
    } catch { /* ignore signaling errors */ }
  }

  stop() {
    this.pcs.forEach((pc) => { try { pc.close(); } catch { /* noop */ } });
    this.pcs.clear();
    this.localStream = null;
    this.role = null;
    this.singerId = null;
  }
}
