import { supabase } from "@/integrations/supabase/client";

export interface VideoClip {
  id: string;
  name: string;
  playerId: string;
  playerName: string;
  startTime: number;
  endTime: number;
  duration: number;
  isMuted: boolean;
  storagePath: string;
  createdAt: Date;
  lobbyId?: string;
}

// In-memory signed URL cache — avoids re-creating URLs when multiple components
// request the same clip (VideoPreview, VideoWithAudioOverlay, thumbnails).
// Entries expire after 50 min (signed URLs are valid 1h).
const urlCache = new Map<string, { url: string; expiresAt: number }>();

class VideoStorageSupabase {
  async uploadVideo(
    file: File,
    clipData: {
      id: string;
      name: string;
      playerId: string;
      playerName: string;
      startTime: number;
      endTime: number;
      isMuted: boolean;
      lobbyId?: string;
    }
  ): Promise<VideoClip> {
    // Upload video/audio to Supabase Storage
    // Override contentType to bypass bucket allowed_mime_types restrictions
    // (e.g. .mkv, .avi, .wav are not in the default allow-list)
    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `${clipData.playerId}/${clipData.id}.${ext}`;
    const contentType = file.type || 'video/mp4';

    const { error: uploadError } = await supabase.storage
      .from('video-challenges')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // Save metadata to database
    const clip: VideoClip = {
      id: clipData.id,
      name: clipData.name,
      playerId: clipData.playerId,
      playerName: clipData.playerName,
      startTime: clipData.startTime,
      endTime: clipData.endTime,
      duration: clipData.endTime - clipData.startTime,
      isMuted: clipData.isMuted,
      storagePath: fileName,
      createdAt: new Date(),
      lobbyId: clipData.lobbyId,
    };

    const { error: dbError } = await supabase
      .from('video_clips')
      .insert({
        id: clip.id,
        player_id: clip.playerId,
        player_name: clip.playerName,
        name: clip.name,
        start_time: clip.startTime,
        end_time: clip.endTime,
        duration: clip.duration,
        is_muted: clip.isMuted,
        storage_path: clip.storagePath,
        lobby_id: clip.lobbyId,
      });

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('video-challenges').remove([fileName]);
      throw new Error(`Failed to save clip metadata: ${dbError.message}`);
    }

    return clip;
  }

  async getVideoClipsByPlayer(playerId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .is('round_number', null) // Exclude recorded imitations (they have a round_number)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
    }));
  }

  async getVideoClip(clipId: string): Promise<VideoClip | null> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('id', clipId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching clip:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      playerId: data.player_id,
      playerName: data.player_name,
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      isMuted: data.is_muted,
      storagePath: data.storage_path,
      createdAt: new Date(data.created_at),
      lobbyId: data.lobby_id,
    };
  }

  async getVideoUrl(clipId: string): Promise<string | null> {
    // Check cache first
    const cached = urlCache.get(clipId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    const clip = await this.getVideoClip(clipId);
    if (!clip) {
      console.error('Clip not found:', clipId);
      return null;
    }

    const { data, error } = await supabase.storage
      .from('video-challenges')
      .createSignedUrl(clip.storagePath, 3600);

    let url: string | null = null;
    if (error) {
      console.error('Error creating signed URL:', error);
      const { data: publicData } = supabase.storage
        .from('video-challenges')
        .getPublicUrl(clip.storagePath);
      url = publicData.publicUrl;
    } else {
      url = data.signedUrl;
    }

    // Cache for 50 min
    if (url) {
      urlCache.set(clipId, { url, expiresAt: Date.now() + 50 * 60 * 1000 });
    }
    return url;
  }

  async deleteVideoClip(clipId: string): Promise<void> {
    const clip = await this.getVideoClip(clipId);
    if (!clip) return;

    // Invalidate cache
    urlCache.delete(clipId);

    // Delete from storage, along with the clip's rythmo cue file when it has
    // one. The cue file is a `<path>.cues.json` sibling of the video, so it is
    // removed here rather than by every caller — otherwise deleting a clip
    // would leave orphaned cues behind in the bucket.
    const cuesPath = `${clip.storagePath.replace(/\.[^./]+$/, '')}.cues.json`;
    const { error: storageError } = await supabase.storage
      .from('video-challenges')
      .remove([clip.storagePath, cuesPath]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('video_clips')
      .delete()
      .eq('id', clipId);

    if (dbError) {
      throw new Error(`Failed to delete clip: ${dbError.message}`);
    }
  }

  async getAllClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lobby clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
    }));
  }

  // Get only original challenge clips (not imitations)
  async getChallengeClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('lobby_id', lobbyId)
      .is('round_number', null) // Only original challenges have no round_number
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching challenge clips:', error);
      return [];
    }

    return (data || []).map(clip => ({
      id: clip.id,
      name: clip.name,
      playerId: clip.player_id,
      playerName: clip.player_name,
      startTime: clip.start_time,
      endTime: clip.end_time,
      duration: clip.duration,
      isMuted: clip.is_muted,
      storagePath: clip.storage_path,
      createdAt: new Date(clip.created_at),
      lobbyId: clip.lobby_id,
    }));
  }

  async getPlayableChallengeClipsByLobby(lobbyId: string): Promise<VideoClip[]> {
    const originalClips = await this.getChallengeClipsByLobby(lobbyId);
    if (originalClips.length > 0) {
      return originalClips;
    }

    const allClips = await this.getAllClipsByLobby(lobbyId);
    const latestByPlayer = new Map<string, VideoClip>();

    for (const clip of allClips) {
      if (!latestByPlayer.has(clip.playerId)) {
        latestByPlayer.set(clip.playerId, clip);
      }
    }

    if (latestByPlayer.size > 0) {
      return Array.from(latestByPlayer.values());
    }

    // Last-resort fallback: clips might have been uploaded in a previous lobby
    // and never re-tagged. Use player_submissions to find which players
    // submitted in this lobby, then grab their most recent clip globally.
    const { data: submissions } = await supabase
      .from("player_submissions")
      .select("player_id")
      .eq("lobby_id", lobbyId);

    const playerIds = Array.from(new Set((submissions || []).map((s) => s.player_id)));
    if (playerIds.length === 0) return [];

    const { data: globalClips } = await supabase
      .from("video_clips")
      .select("*")
      .in("player_id", playerIds)
      .order("created_at", { ascending: false });

    const latestGlobal = new Map<string, VideoClip>();
    for (const clip of globalClips || []) {
      if (!latestGlobal.has(clip.player_id)) {
        latestGlobal.set(clip.player_id, {
          id: clip.id,
          name: clip.name,
          playerId: clip.player_id,
          playerName: clip.player_name,
          startTime: clip.start_time,
          endTime: clip.end_time,
          duration: clip.duration,
          isMuted: clip.is_muted,
          storagePath: clip.storage_path,
          createdAt: new Date(clip.created_at),
          lobbyId: clip.lobby_id,
        });
      }
    }

    return Array.from(latestGlobal.values());
  }

  async getLatestClipByPlayerInLobby(playerId: string, lobbyId: string): Promise<VideoClip | null> {
    // Retry logic for better reliability
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('video_clips')
          .select('*')
          .eq('player_id', playerId)
          .eq('lobby_id', lobbyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          lastError = new Error(error.message);
          console.warn(`Attempt ${attempt + 1} failed fetching clip:`, error);
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }

        if (!data) {
          console.log(`No clip found for player ${playerId} in lobby ${lobbyId}`);
          return null;
        }

        return {
          id: data.id,
          name: data.name,
          playerId: data.player_id,
          playerName: data.player_name,
          startTime: data.start_time,
          endTime: data.end_time,
          duration: data.duration,
          isMuted: data.is_muted,
          storagePath: data.storage_path,
          createdAt: new Date(data.created_at),
          lobbyId: data.lobby_id,
        };
      } catch (err) {
        lastError = err as Error;
        console.warn(`Attempt ${attempt + 1} exception:`, err);
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    
    console.error('All retries failed fetching latest clip:', lastError);
    return null;
  }

  async getClipByPlayerAfterTime(playerId: string, lobbyId: string, afterTime: Date): Promise<VideoClip | null> {
    const { data, error } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .eq('lobby_id', lobbyId)
      .gte('created_at', afterTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      playerId: data.player_id,
      playerName: data.player_name,
      startTime: data.start_time,
      endTime: data.end_time,
      duration: data.duration,
      isMuted: data.is_muted,
      storagePath: data.storage_path,
      createdAt: new Date(data.created_at),
      lobbyId: data.lobby_id,
    };
  }

  async getClipByPlayerAndRound(playerId: string, lobbyId: string, roundNumber: number): Promise<VideoClip | null> {
    // First try to get clip by round_number
    const { data: roundData, error: roundError } = await supabase
      .from('video_clips')
      .select('*')
      .eq('player_id', playerId)
      .eq('lobby_id', lobbyId)
      .eq('round_number', roundNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!roundError && roundData) {
      return {
        id: roundData.id,
        name: roundData.name,
        playerId: roundData.player_id,
        playerName: roundData.player_name,
        startTime: roundData.start_time,
        endTime: roundData.end_time,
        duration: roundData.duration,
        isMuted: roundData.is_muted,
        storagePath: roundData.storage_path,
        createdAt: new Date(roundData.created_at),
        lobbyId: roundData.lobby_id,
      };
    }

    return null;
  }
}

export const videoStorage = new VideoStorageSupabase();
