export enum Page {
  Dashboard = 'DASHBOARD',
  Create = 'CREATE',
  Studio = 'STUDIO',
  Library = 'LIBRARY',
  Marketplace = 'MARKETPLACE',
  Profile = 'PROFILE',
  Billing = 'BILLING',
}

export type Plan = 'Freemium' | 'Pro' | 'Alpha';

export type VisualizerStyle = 'Waveform' | 'Bars' | 'Particles';

export interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'Paid' | 'Refunded';
    pdfUrl: string;
}

export interface Project {
  id:string;
  name: string;
  prompt: string;
  duration: string;
  createdAt: string;
  videoUrl: string;
  copyrightTokenId: string;
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
  veoVideo?: any; // To store the video object from VEO for extensions
  isListed?: boolean;
  priceSol?: number;
  moodVibrancy: number;
  syncIntensity: number;
  zoom: number; // 0-100
  pan: number; // -50 to 50
  tilt: number; // -50 to 50
  depthOfField: 'Low' | 'Medium' | 'High';
  volumeMix: {
      drums: number; // 0-100
      vocals: number; // 0-100
      bass: number; // 0-100
      melody: number; // 0-100
  };
  visualizerStyle?: VisualizerStyle;
  isBeatSyncEnabled?: boolean;
  waveformThickness?: number;
  waveformSensitivity?: number;
  visualizerColor?: string;
}

export interface Beat {
  timestamp: number;
  intensity: number; // Overall intensity (RMS)
  bassIntensity: number; // Bass intensity (low-frequency energy)
}

export interface TimelineCommand {
  timestamp: number;
  command: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}