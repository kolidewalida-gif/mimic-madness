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
    // Upload video to Supabase Storage
    const fileName = `${clipData.playerId}/${clipData.id}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('video-challenges')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
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
      .single();

    if (error || !data) {
      console.error('Error fetching clip:', error);
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
    const clip = await this.getVideoClip(clipId);
    if (!clip) {
      console.error('Clip not found:', clipId);
      return null;
    }

    console.log('Getting URL for clip:', clipId, 'path:', clip.storagePath);

    // Use signed URL for more reliability
    const { data, error } = await supabase.storage
      .from('video-challenges')
      .createSignedUrl(clip.storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      // Fallback to public URL
      const { data: publicData } = supabase.storage
        .from('video-challenges')
        .getPublicUrl(clip.storagePath);
      return publicData.publicUrl;
    }

    console.log('Signed URL created:', data.signedUrl);
    return data.signedUrl;
  }

  async deleteVideoClip(clipId: string): Promise<void> {
    // Get clip to find storage path
    const clip = await this.getVideoClip(clipId);
    if (!clip) return;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('video-challenges')
      .remove([clip.storagePath]);

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
}

export const videoStorage = new VideoStorageSupabase();
