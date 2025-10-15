// Local video storage using IndexedDB - Free forever!
export interface VideoClip {
  id: string;
  name: string;
  originalFile: File;
  startTime: number;
  endTime: number;
  duration: number;
  createdAt: Date;
  playerId: string;
}

export interface VideoChallenge {
  id: string;
  videoClip: VideoClip;
  createdBy: string;
  submittedAt: Date;
}

class VideoStorageManager {
  private dbName = "ImitationGameVideos";
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for video clips
        if (!db.objectStoreNames.contains("videoClips")) {
          const clipStore = db.createObjectStore("videoClips", { keyPath: "id" });
          clipStore.createIndex("playerId", "playerId", { unique: false });
        }
        
        // Store for video files (as blobs)
        if (!db.objectStoreNames.contains("videoFiles")) {
          db.createObjectStore("videoFiles", { keyPath: "id" });
        }
      };
    });
  }

  async saveVideoClip(clip: VideoClip, videoBlob: Blob): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["videoClips", "videoFiles"], "readwrite");
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      // Save clip metadata
      const clipStore = transaction.objectStore("videoClips");
      const clipData = {
        id: clip.id,
        name: clip.name,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        createdAt: clip.createdAt.toISOString(),
        playerId: clip.playerId,
        fileName: clip.originalFile.name,
        fileSize: clip.originalFile.size,
        fileType: clip.originalFile.type,
      };
      clipStore.put(clipData);
      
      // Save video file as blob
      const fileStore = transaction.objectStore("videoFiles");
      fileStore.put({ id: clip.id, blob: videoBlob });
    });
  }

  async getVideoClipsByPlayer(playerId: string): Promise<VideoClip[]> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("videoClips", "readonly");
      const store = transaction.objectStore("videoClips");
      const index = store.index("playerId");
      const request = index.getAll(playerId);
      
      request.onsuccess = () => {
        const clips = request.result.map(clip => ({
          ...clip,
          createdAt: new Date(clip.createdAt),
          originalFile: new File([], clip.fileName, { type: clip.fileType })
        }));
        resolve(clips);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getVideoBlob(clipId: string): Promise<Blob | null> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("videoFiles", "readonly");
      const store = transaction.objectStore("videoFiles");
      const request = store.get(clipId);
      
      request.onsuccess = () => {
        resolve(request.result?.blob || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteVideoClip(clipId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["videoClips", "videoFiles"], "readwrite");
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      
      const clipStore = transaction.objectStore("videoClips");
      clipStore.delete(clipId);
      
      const fileStore = transaction.objectStore("videoFiles");
      fileStore.delete(clipId);
    });
  }

  async getVideoUrl(clipId: string): Promise<string | null> {
    const blob = await this.getVideoBlob(clipId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  async getAllClips(): Promise<VideoClip[]> {
    if (!this.db) throw new Error("Database not initialized");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction("videoClips", "readonly");
      const store = transaction.objectStore("videoClips");
      const request = store.getAll();
      
      request.onsuccess = () => {
        const clips = request.result.map(clip => ({
          ...clip,
          createdAt: new Date(clip.createdAt),
          originalFile: new File([], clip.fileName, { type: clip.fileType })
        }));
        resolve(clips);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const videoStorage = new VideoStorageManager();