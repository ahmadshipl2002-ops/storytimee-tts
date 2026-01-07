
export type Emotion = 'Calm' | 'Happy' | 'Sad' | 'Shy' | 'Gentle' | 'Excited';
export type Tone = 'Soft' | 'Warm' | 'Friendly';
export type Speed = 'Slow' | 'Normal' | 'Fast';

export interface StoryPage {
  id: number;
  content: string;
}

export interface GeneratedAudio {
  pageId: number;
  blob: Blob;
  url: string;
  filename: string;
}

export interface TTSConfig {
  emotion: Emotion;
  tone: Tone;
  speed: Speed;
}
