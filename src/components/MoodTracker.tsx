import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoodEntry, MOOD_TAGS, MOOD_LEVELS } from '../types';
import { ArchiveMatch, matchLyricArchive, getArchiveSize } from '../data/lyricArchive';
import { Loader2, Save, Send, Tag, X } from 'lucide-react';

interface MoodTrackerProps {
  onSave: (entry: MoodEntry) => void;
  editingEntry?: MoodEntry | null;
  onCancelEdit?: () => void;
}

export const MoodTracker: React.FC<MoodTrackerProps> = ({ onSave, editingEntry, onCancelEdit }) => {
  const [mood, setMood] = useState<number>(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<ArchiveMatch | null>(null);
  const scanTimeout = useRef<number | null>(null);
  const isEditing = Boolean(editingEntry);

  useEffect(() => {
    return () => {
      if (scanTimeout.current) {
        window.clearTimeout(scanTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editingEntry) {
      setMood(3);
      setSelectedTags([]);
      setNote('');
      setGeneratedLyrics(null);
      return;
    }

    setMood(editingEntry.mood);
    setSelectedTags(editingEntry.tags);
    setNote(editingEntry.note);
    setGeneratedLyrics(
      editingEntry.lyrics && editingEntry.songInfo
        ? {
            echo: editingEntry.lyrics,
            song: editingEntry.songInfo,
            debug: editingEntry.matchDebug || [],
          }
        : null
    );
  }, [editingEntry]);

  const toggleTag = (tag: string) => {
    setGeneratedLyrics(null);
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const generateLyrics = async (moodLevel: number, tags: string[]) => {
    setGeneratedLyrics(null); // Reset state before fetching
    setIsGenerating(true);
    if (scanTimeout.current) {
      window.clearTimeout(scanTimeout.current);
    }
    scanTimeout.current = window.setTimeout(() => {
      const match = matchLyricArchive(moodLevel, tags, note);
      setGeneratedLyrics(match);
      setIsGenerating(false);
      scanTimeout.current = null;
    }, 450);
  };

  const handleSubmit = async () => {
    const entry: MoodEntry = {
      id: editingEntry?.id || crypto.randomUUID(),
      timestamp: editingEntry?.timestamp || Date.now(),
      mood,
      tags: selectedTags,
      note,
      lyrics: generatedLyrics?.echo,
      songInfo: generatedLyrics?.song,
      matchDebug: generatedLyrics?.debug,
    };
    onSave(entry);
    
    // Reset form
    setNote('');
    setSelectedTags([]);
    setGeneratedLyrics(null);
  };

  const showMatchDebug = import.meta.env.DEV && generatedLyrics?.debug && generatedLyrics.debug.length > 0;

  return (
    <div className="space-y-6">
      <div className="brutalist-border p-6 bg-black/40">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary">
            {isEditing ? 'Edit: Emotional_Record' : 'Input: Emotional_State'}
          </h3>
          {isEditing && (
            <button
              onClick={onCancelEdit}
              className="p-2 text-[#666] hover:text-primary transition-colors"
              title="Cancel edit"
              aria-label="Cancel edit"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Mood Slider */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {MOOD_LEVELS.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setMood(m.value);
                  setGeneratedLyrics(null);
                }}
                aria-label={`Set mood to ${m.label}`}
                className={`flex flex-col items-center transition-all ${mood === m.value ? 'scale-110 opacity-100' : 'opacity-40 grayscale'}`}
              >
                <div 
                  className="w-10 h-10 rounded-none border-2 flex items-center justify-center mb-1" 
                  style={{ 
                    borderColor: m.value === 3 ? 'var(--primary-color)' : m.color,
                    color: m.value === 3 ? 'var(--primary-color)' : m.color 
                  }}
                >
                  <span className="font-digital text-xl font-bold">{m.value}</span>
                </div>
                <span className="text-[10px] uppercase font-mono">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 opacity-70">
            <Tag size={14} />
            <span className="text-[10px] font-mono uppercase">Descriptors</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-[11px] font-mono border transition-all ${
                  selectedTags.includes(tag) 
                    ? 'bg-primary text-black border-primary' 
                    : 'border-[#333] text-[#666] hover:border-[#666]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 opacity-70">
            <Send size={14} />
            <span className="text-[10px] font-mono uppercase">Log_Entry</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setGeneratedLyrics(null);
            }}
            placeholder="What's happening in the simulation?..."
            className="w-full bg-transparent border-2 border-[#333] p-4 font-mono text-sm focus:border-primary outline-none min-h-[100px] resize-none"
          />
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          {!generatedLyrics ? (
            <button
              onClick={() => generateLyrics(mood, selectedTags)}
              disabled={isGenerating}
              className="flex-1 py-3 bg-[#1a1a1a] border-2 border-[#333] hover:border-primary text-primary font-mono uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
              {isGenerating ? 'Scanning Archive...' : 'Fetch Echoes'}
            </button>
          ) : (
            <>
              <button
                onClick={() => generateLyrics(mood, selectedTags)}
                disabled={isGenerating}
                className="sm:w-44 py-3 bg-[#1a1a1a] border-2 border-[#333] hover:border-primary text-primary font-mono uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : null}
                Rescan
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-primary text-black font-mono font-bold uppercase text-xs tracking-widest hover:bg-white transition-all"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isEditing ? <Save size={16} /> : null}
                  {isEditing ? 'Update Record' : 'Commit to Database'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lyrics Preview */}
      <AnimatePresence>
        {generatedLyrics && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="brutalist-border p-6 bg-primary/5 border-primary/30 relative overflow-hidden"
          >
            <h4 className="text-[10px] font-mono uppercase text-primary mb-4 tracking-[0.3em]">Retrieved_Echo</h4>
            <p className="text-xl font-serif italic mb-4 leading-relaxed">
              "{generatedLyrics.echo}"
            </p>
            <p className="text-xs font-mono text-primary/70">
              — {generatedLyrics.song}
            </p>
            {showMatchDebug && (
              <div className="mt-4 border-t border-[#333] pt-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#666] mb-2">Dev_Match_Score</p>
                <div className="flex flex-wrap gap-2">
                  {generatedLyrics.debug.map((reason) => (
                    <span key={reason} className="text-[10px] font-mono uppercase border border-[#333] px-2 py-1 text-primary/70">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-[10px] font-mono uppercase tracking-widest opacity-40">
              Offline archive: {getArchiveSize()} records
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
