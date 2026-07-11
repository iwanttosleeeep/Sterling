export interface MoodEntry {
  id: string;
  timestamp: number;
  mood: number; // 1-5
  tags: string[];
  note: string;
  lyrics?: string;
  songInfo?: string;
  matchDebug?: string[];
}

export interface VaultFile {
  version: 1;
  entries: MoodEntry[];
}

export const MOOD_TAGS = [
  "Energetic", "Melancholic", "Anxious", "Calm", "Inspired", 
  "Frustrated", "Nostalgic", "Hopeful", "Restless", "Dreamy",
  "Bittersweet", "Ethereal", "Gritty", "Vibrant", "Subdued",
  "Wistful", "Defiant", "Serene", "Electric", "Gloomy",
  "Burnout", "Quarter-Life", "Hustling", "Overwhelmed", "Chill",
  "Spontaneous", "Existential", "Ambitious", "Lost", "Found",
  "Caffeinated", "Socially Drained", "Productive", "Procrastinating",
  "Adventurous", "Lonely", "Connected", "Uncertain", "Driven", "Vulnerable"
];

export const MOOD_LEVELS = [
  { value: 1, label: "Awful", color: "#ef4444" },
  { value: 2, label: "Bad", color: "#f97316" },
  { value: 3, label: "Fine", color: "#00ff00" },
  { value: 4, label: "Good", color: "#22c55e" },
  { value: 5, label: "Great", color: "#3b82f6" },
];
