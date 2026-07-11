import archive from './archive.json';

export interface ArchiveMatch {
  echo: string;
  song: string;
  debug: string[];
}

interface ArchiveEntry extends ArchiveMatch {
  moods: number[];
  tags: string[];
  keywords: string[];
  energy: number;
  valence: number;
}

const ARCHIVE = archive as ArchiveEntry[];

const TAG_NEIGHBORS: Record<string, string[]> = {
  Energetic: ["Electric", "Vibrant", "Driven", "Caffeinated"],
  Melancholic: ["Wistful", "Gloomy", "Bittersweet", "Lonely"],
  Anxious: ["Restless", "Overwhelmed", "Uncertain", "Vulnerable"],
  Calm: ["Serene", "Chill", "Subdued"],
  Inspired: ["Hopeful", "Ambitious", "Driven", "Found"],
  Frustrated: ["Defiant", "Restless", "Overwhelmed"],
  Nostalgic: ["Wistful", "Bittersweet", "Quarter-Life"],
  Hopeful: ["Found", "Inspired", "Serene", "Driven"],
  Restless: ["Electric", "Anxious", "Spontaneous"],
  Dreamy: ["Ethereal", "Wistful", "Serene"],
  Bittersweet: ["Wistful", "Melancholic", "Hopeful"],
  Ethereal: ["Dreamy", "Serene", "Subdued"],
  Gritty: ["Defiant", "Restless", "Subdued"],
  Vibrant: ["Energetic", "Electric", "Connected"],
  Subdued: ["Calm", "Melancholic", "Serene"],
  Wistful: ["Nostalgic", "Bittersweet", "Melancholic"],
  Defiant: ["Driven", "Gritty", "Frustrated"],
  Serene: ["Calm", "Ethereal", "Hopeful"],
  Electric: ["Energetic", "Vibrant", "Spontaneous"],
  Gloomy: ["Melancholic", "Lonely", "Lost"],
  Burnout: ["Overwhelmed", "Subdued", "Lost"],
  "Quarter-Life": ["Nostalgic", "Uncertain", "Ambitious"],
  Hustling: ["Driven", "Productive", "Caffeinated"],
  Overwhelmed: ["Anxious", "Burnout", "Vulnerable"],
  Chill: ["Calm", "Serene", "Dreamy"],
  Spontaneous: ["Electric", "Adventurous", "Restless"],
  Existential: ["Lost", "Dreamy", "Melancholic"],
  Ambitious: ["Driven", "Inspired", "Hustling"],
  Lost: ["Uncertain", "Lonely", "Existential"],
  Found: ["Hopeful", "Connected", "Serene"],
  Caffeinated: ["Energetic", "Hustling", "Restless"],
  "Socially Drained": ["Subdued", "Lonely", "Overwhelmed"],
  Productive: ["Driven", "Hustling", "Inspired"],
  Procrastinating: ["Restless", "Anxious", "Quarter-Life"],
  Adventurous: ["Spontaneous", "Energetic", "Hopeful"],
  Lonely: ["Melancholic", "Lost", "Vulnerable"],
  Connected: ["Found", "Hopeful", "Vibrant"],
  Uncertain: ["Anxious", "Lost", "Quarter-Life"],
  Driven: ["Ambitious", "Productive", "Defiant"],
  Vulnerable: ["Anxious", "Bittersweet", "Lonely"],
};

const RECENT_KEY = "lyric_archive_recent";
const RECENT_LIMIT = 8;

export const getArchiveSize = () => ARCHIVE.length;

export const matchLyricArchive = (mood: number, tags: string[], note: string): ArchiveMatch => {
  const selected = new Set(tags);
  const related = new Set(tags.flatMap((tag) => TAG_NEIGHBORS[tag] || []));
  const noteWords = normalizeWords(note);
  const recentSongs = readRecentSongs();

  const ranked = ARCHIVE.map((entry) => {
    let score = 0;
    const debug: string[] = [];

    if (entry.moods.includes(mood)) {
      score += 24;
      debug.push('Mood +24');
    } else {
      const distance = Math.min(...entry.moods.map((entryMood) => Math.abs(entryMood - mood)));
      const moodScore = Math.max(0, 14 - distance * 5);
      score += moodScore;
      if (moodScore > 0) debug.push(`Mood distance +${moodScore}`);
    }

    for (const tag of entry.tags) {
      if (selected.has(tag)) {
        score += 12;
        debug.push(`Tag ${tag} +12`);
      }
      if (related.has(tag)) {
        score += 5;
        debug.push(`Related ${tag} +5`);
      }
    }

    for (const keyword of entry.keywords) {
      if (noteWords.has(keyword)) {
        score += 10;
        debug.push(`Note ${keyword} +10`);
      }
    }

    const energyScore = Math.max(0, 4 - Math.abs(entry.energy - mood));
    const valenceScore = Math.max(0, 4 - Math.abs(entry.valence - mood));
    score += energyScore;
    score += valenceScore;
    if (energyScore > 0) debug.push(`Energy +${energyScore}`);
    if (valenceScore > 0) debug.push(`Valence +${valenceScore}`);

    if (recentSongs.includes(entry.song)) {
      score -= 18;
      debug.push('Recent pick -18');
    }

    const varietyScore = Math.random() * 7;
    score += varietyScore;
    debug.push(`Variety +${varietyScore.toFixed(1)}`);

    return { entry, score, debug };
  }).sort((a, b) => b.score - a.score);

  const pool = ranked.slice(0, Math.min(6, ranked.length));
  const match = weightedPick(pool);
  rememberSong(match.entry.song);

  return {
    echo: match.entry.echo,
    song: match.entry.song,
    debug: [`Total ${match.score.toFixed(1)}`, ...match.debug.slice(0, 6)],
  };
};

const normalizeWords = (text: string) => {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const phrases = new Set(words);
  for (let index = 0; index < words.length - 1; index += 1) {
    phrases.add(`${words[index]} ${words[index + 1]}`);
  }

  return phrases;
};

const weightedPick = (ranked: { entry: ArchiveEntry; score: number; debug: string[] }[]) => {
  const floor = Math.min(...ranked.map((item) => item.score));
  const weights = ranked.map((item) => Math.max(1, item.score - floor + 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = Math.random() * total;

  for (let index = 0; index < ranked.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return ranked[index];
  }

  return ranked[0];
};

const readRecentSongs = () => {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) as string[] : [];
  } catch {
    return [];
  }
};

const rememberSong = (song: string) => {
  const recentSongs = [song, ...readRecentSongs().filter((recentSong) => recentSong !== song)]
    .slice(0, RECENT_LIMIT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentSongs));
};
