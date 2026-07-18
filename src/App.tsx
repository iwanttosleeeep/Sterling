import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Countdown } from './components/Countdown';
import { MoodTracker } from './components/MoodTracker';
import { MoodEntry, MOOD_LEVELS, MOOD_TAGS, VaultFile } from './types';
import { matchLyricArchive } from './data/lyricArchive';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, History, Activity, Database, Trash2, Settings, Palette, Download, Upload, Edit3, RefreshCw, Search, X, FileText, CloudUpload } from 'lucide-react';

type TabId = 'track' | 'history' | 'stats' | 'settings';

const MoodChart = React.lazy(() =>
  import('./components/MoodChart').then((module) => ({ default: module.MoodChart }))
);

const THEME_COLORS = [
  // Shuffled for maximum visual variety in 3x4 grid
  { name: 'Matrix Green', value: '#00ff00' },
  { name: 'Blood Protocol', value: '#ff0000' },
  { name: 'Neon Cobalt', value: '#2563eb' },
  { name: 'Chrome Alloy', value: '#cbd5e1' },
  
  { name: 'Warning Pulse', value: '#facc15' },
  { name: 'Forest Glitch', value: '#166534' },
  { name: 'Cyber Pink', value: '#ff00ff' },
  { name: 'Deep Sea', value: '#0088ff' },
  
  { name: 'Void White', value: '#ffffff' },
  { name: 'Cyan Static', value: '#06b6d4' },
  { name: 'Violet Neural', value: '#a855f7' },
  { name: 'Acid Emerald', value: '#4ade80' },
];

export default function App() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('track');
  const [themeColor, setThemeColor] = useState('#00ff00');
  const [backupStatus, setBackupStatus] = useState('');
  const [gardenUrl, setGardenUrl] = useState('');
  const [gardenSyncKey, setGardenSyncKey] = useState('');
  const [gardenSyncStatus, setGardenSyncStatus] = useState('');
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveMood, setArchiveMood] = useState('all');
  const [archiveTag, setArchiveTag] = useState('all');
  const [archiveDate, setArchiveDate] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = useMemo(() => {
    const search = archiveSearch.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesMood = archiveMood === 'all' || entry.mood === Number(archiveMood);
      const matchesTag = archiveTag === 'all' || entry.tags.includes(archiveTag);
      const matchesDate = !archiveDate || formatDateInput(entry.timestamp) === archiveDate;
      const matchesSearch = !search || [
        entry.note,
        entry.songInfo,
        entry.lyrics,
        ...entry.tags,
      ].some((value) => value?.toLowerCase().includes(search));

      return matchesMood && matchesTag && matchesDate && matchesSearch;
    });
  }, [archiveDate, archiveMood, archiveSearch, archiveTag, entries]);

  const hasArchiveFilters = archiveSearch || archiveMood !== 'all' || archiveTag !== 'all' || archiveDate;

  useEffect(() => {
    const savedEntries = localStorage.getItem('mood_entries');
    if (savedEntries) {
      try {
        const parsedEntries = JSON.parse(savedEntries);
        const loadedEntries = parseBackupEntries(parsedEntries);
        if (loadedEntries.length > 0) {
          setEntries(loadedEntries);
          localStorage.setItem('mood_entries', JSON.stringify(createVaultFile(loadedEntries)));
        }
      } catch (e) {
        console.error("Failed to load entries", e);
      }
    }

    const savedTheme = localStorage.getItem('app_theme_color');
    if (savedTheme) {
      setThemeColor(savedTheme);
      document.documentElement.style.setProperty('--primary-color', savedTheme);
    }
    setGardenUrl(localStorage.getItem('garden_sync_url') || '');
    setGardenSyncKey(localStorage.getItem('garden_sync_key') || '');
  }, []);

  const saveGardenSyncSettings = () => {
    localStorage.setItem('garden_sync_url', gardenUrl.trim().replace(/\/$/, ''));
    localStorage.setItem('garden_sync_key', gardenSyncKey.trim());
    setGardenSyncStatus('GARDEN CONNECTION SAVED LOCALLY');
  };

  const syncToGarden = async () => {
    const baseUrl = gardenUrl.trim().replace(/\/$/, '');
    const key = gardenSyncKey.trim();
    if (!baseUrl || !key) { setGardenSyncStatus('SYNC FAILED / ADD GARDEN URL + SYNC KEY'); return; }
    try {
      setGardenSyncStatus('SYNCING TO GARDEN…');
      const response = await fetch(`${baseUrl}/api/journal/sync/push`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ app: 'sterling', exportedAt: new Date().toISOString(), themeColor, ...createVaultFile(entries) }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setGardenSyncStatus(`SYNC COMPLETE / ${data.imported} NEW / ${data.skipped} UNCHANGED`);
    } catch (error) {
      setGardenSyncStatus(`SYNC FAILED / ${error instanceof Error ? error.message : 'NETWORK ERROR'}`);
    }
  };

  const saveEntry = (entry: MoodEntry) => {
    setEntries((currentEntries) => {
      const exists = currentEntries.some((currentEntry) => currentEntry.id === entry.id);
      const newEntries = exists
        ? currentEntries.map((currentEntry) => currentEntry.id === entry.id ? entry : currentEntry)
        : [entry, ...currentEntries];
      localStorage.setItem('mood_entries', JSON.stringify(createVaultFile(newEntries)));
      return newEntries;
    });
    setEditingEntry(null);
    setActiveTab('history');
  };

  const deleteEntry = (id: string) => {
    setEntries((currentEntries) => {
      const newEntries = currentEntries.filter(e => e.id !== id);
      localStorage.setItem('mood_entries', JSON.stringify(createVaultFile(newEntries)));
      return newEntries;
    });
  };

  const updateTheme = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('app_theme_color', color);
    document.documentElement.style.setProperty('--primary-color', color);
  };

  const startEditEntry = (entry: MoodEntry) => {
    setEditingEntry(entry);
    setActiveTab('track');
  };

  const rescanEntryEcho = (entry: MoodEntry) => {
    const match = matchLyricArchive(entry.mood, entry.tags, entry.note);
    saveEntry({
      ...entry,
      lyrics: match.echo,
      songInfo: match.song,
      matchDebug: match.debug,
    });
  };

  const clearArchiveFilters = () => {
    setArchiveSearch('');
    setArchiveMood('all');
    setArchiveTag('all');
    setArchiveDate('');
  };

  const exportEntries = () => {
    const backup = {
      app: '2029-access-granted',
      exportedAt: new Date().toISOString(),
      themeColor,
      ...createVaultFile(entries),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `2029-access-granted-backup-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupStatus(`EXPORT COMPLETE / ${entries.length} RECORDS`);
  };

  const importEntries = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const importedEntries = parseBackupEntries(data);

      if (importedEntries.length === 0) {
        setBackupStatus('IMPORT FAILED / NO VALID RECORDS');
        return;
      }

      setEntries((currentEntries) => {
        const mergedEntries = mergeEntries(currentEntries, importedEntries);
        localStorage.setItem('mood_entries', JSON.stringify(createVaultFile(mergedEntries)));
        setBackupStatus(`IMPORT COMPLETE / ${mergedEntries.length} RECORDS`);
        return mergedEntries;
      });

      if (typeof data?.themeColor === 'string') {
        updateTheme(data.themeColor);
      }
    } catch (error) {
      console.error('Failed to import backup', error);
      setBackupStatus('IMPORT FAILED / INVALID FILE');
    } finally {
      event.target.value = '';
    }
  };

  const exportToMarkdown = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStamp = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const rows = entries
      .filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
      })
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((entry) => {
        const date = formatDateInput(entry.timestamp);
        const mood = MOOD_LEVELS.find((level) => level.value === entry.mood)?.label ?? entry.mood;
        const tags = entry.tags.join(', ');
        const echo = [entry.songInfo, entry.lyrics].filter(Boolean).join(' / ');

        return `| ${date} | ${escapeMarkdownCell(String(mood))} | ${escapeMarkdownCell(tags)} | ${escapeMarkdownCell(echo)} | ${escapeMarkdownCell(entry.note)} |`;
      });

    const md = [
      `# Mood Log - ${monthStamp}`,
      '',
      `Exported: ${now.toISOString().slice(0, 10)}`,
      '',
      '| Date | Mood | Tags | Echo | Note |',
      '|---|---|---|---|---|',
      ...rows,
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `mood-log-${monthStamp}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupStatus(`MARKDOWN EXPORT COMPLETE / ${rows.length} RECORDS`);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Terminal size={18} />
            <span className="text-[10px] font-pixel uppercase tracking-widest">Access_Granted</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold font-pixel tracking-tighter leading-none">
            2029<span className="text-primary">.</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-pixel uppercase opacity-40 mb-2">User_Session</p>
          <p className="text-xs font-pixel text-primary uppercase">AINSLEY</p>
        </div>
      </header>

      <Countdown />

      {/* Navigation */}
      <nav className="flex border-b border-[#333] mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'track', label: 'Monitor', icon: Activity },
          { id: 'history', label: 'Archive', icon: History },
          { id: 'stats', label: 'Analytics', icon: Database },
          { id: 'settings', label: 'Config', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-mono uppercase tracking-widest transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-primary' : 'text-[#666] hover:text-[#999]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        ))}
      </nav>

      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'track' && (
            <motion.div
              key="track"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MoodTracker
                onSave={saveEntry}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="brutalist-border p-4 bg-black/30">
                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_0.7fr_1fr_0.8fr_auto] gap-3">
                  <label className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={14} />
                    <input
                      value={archiveSearch}
                      onChange={(event) => setArchiveSearch(event.target.value)}
                      placeholder="Search archive..."
                      className="w-full bg-black/30 border border-[#333] pl-9 pr-3 py-3 font-mono text-xs focus:border-primary outline-none"
                    />
                  </label>
                  <select
                    value={archiveMood}
                    onChange={(event) => setArchiveMood(event.target.value)}
                    className="bg-black/30 border border-[#333] px-3 py-3 font-mono text-xs focus:border-primary outline-none"
                    aria-label="Filter by mood"
                  >
                    <option value="all">All moods</option>
                    {MOOD_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>{level.value} / {level.label}</option>
                    ))}
                  </select>
                  <select
                    value={archiveTag}
                    onChange={(event) => setArchiveTag(event.target.value)}
                    className="bg-black/30 border border-[#333] px-3 py-3 font-mono text-xs focus:border-primary outline-none"
                    aria-label="Filter by tag"
                  >
                    <option value="all">All tags</option>
                    {MOOD_TAGS.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={archiveDate}
                    onChange={(event) => setArchiveDate(event.target.value)}
                    className="bg-black/30 border border-[#333] px-3 py-3 font-mono text-xs focus:border-primary outline-none"
                    aria-label="Filter by date"
                  />
                  <button
                    onClick={clearArchiveFilters}
                    disabled={!hasArchiveFilters}
                    className="px-4 py-3 border border-[#333] hover:border-primary disabled:opacity-40 disabled:hover:border-[#333] text-primary font-mono uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                  >
                    <X size={14} />
                    Clear
                  </button>
                </div>
              </div>

              {entries.length === 0 ? (
                <div className="p-12 text-center brutalist-border opacity-30 font-mono text-sm">
                  NO RECORDS FOUND IN DATABASE
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center brutalist-border opacity-30 font-mono text-sm">
                  NO MATCHING RECORDS
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.id} className="brutalist-border p-6 bg-black/40 group hover:bg-black/60 transition-all relative">
                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditEntry(entry)}
                        className="p-2 text-[#666] hover:text-primary focus:text-primary transition-colors"
                        title="Edit entry"
                        aria-label="Edit entry"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => rescanEntryEcho(entry)}
                        className="p-2 text-[#666] hover:text-primary focus:text-primary transition-colors"
                        title="Rescan echo"
                        aria-label="Rescan echo"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 text-[#666] hover:text-red-500 focus:text-red-500 transition-colors"
                        title="Delete Entry"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex justify-between items-start mb-4 pr-24">
                      <div>
                        <span className="text-[10px] font-mono text-[#666] block mb-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[#333] text-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-2xl font-bold font-digital text-primary">
                        {entry.mood}/5
                      </div>
                    </div>
                    
                    {entry.note && (
                      <p className="text-sm font-mono text-[#999] mb-4 border-l-2 border-[#333] pl-4 italic">
                        {entry.note}
                      </p>
                    )}

                    {entry.lyrics && (
                      <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                        <p className="text-sm font-serif italic mb-1 opacity-80">"{entry.lyrics}"</p>
                        <p className="text-[10px] font-mono text-primary/50 uppercase">— {entry.songInfo}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <React.Suspense
                fallback={
                  <div className="h-[300px] w-full p-4 brutalist-border bg-black/40 flex items-center justify-center text-xs font-mono opacity-30">
                    Loading visualization
                  </div>
                }
              >
                <MoodChart entries={entries} />
              </React.Suspense>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="brutalist-border p-6 bg-black/40">
                  <h4 className="text-[10px] font-mono uppercase text-[#666] mb-4">Database_Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-mono">
                      <span>Total Entries</span>
                      <span className="text-primary font-digital">{entries.length}</span>
                    </div>
                    <div className="flex justify-between text-sm font-mono">
                      <span>Avg. Mood</span>
                      <span className="text-primary font-digital">
                        {entries.length > 0 
                          ? (entries.reduce((acc, curr) => acc + curr.mood, 0) / entries.length).toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="brutalist-border p-6 bg-black/40">
                  <h4 className="text-[10px] font-mono uppercase text-[#666] mb-4">System_Status</h4>
                  <div className="flex items-center gap-2 text-primary text-sm font-mono">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ONLINE / SYNCED
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="brutalist-border p-8 bg-black/40">
                <div className="flex items-center gap-3 mb-8">
                  <Palette className="text-primary" size={20} />
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-primary">Interface_Configuration</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {THEME_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateTheme(color.value)}
                      className={`p-4 brutalist-border flex flex-col items-center gap-3 transition-all ${
                        themeColor === color.value ? 'border-primary bg-primary/10' : 'bg-black/20'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-none border-2 border-white/20" 
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-wider">{color.name}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-12 p-6 border border-[#333] bg-black/20">
                  <h4 className="text-[10px] font-mono uppercase text-[#666] mb-4 tracking-widest">System_Info</h4>
                  <p className="text-xs font-mono text-[#999] leading-relaxed">
                    The simulation is currently running on protocol version 1.2.7. All emotional data is stored locally within the browser's persistent memory. 
                    <br /><br />
                    Target Date: 2029-08-21
                  </p>
                </div>

                <div className="mt-6 p-6 border border-[#333] bg-black/20">
                  <h4 className="text-[10px] font-mono uppercase text-[#666] mb-4 tracking-widest">Backup_Archive</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={exportEntries}
                      disabled={entries.length === 0}
                      className="flex-1 py-3 px-4 border-2 border-[#333] hover:border-primary disabled:opacity-40 disabled:hover:border-[#333] text-primary font-mono uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Download size={16} />
                      Export Records
                    </button>
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className="flex-1 py-3 px-4 bg-primary text-black font-mono font-bold uppercase text-xs tracking-widest hover:bg-white flex items-center justify-center gap-2 transition-all"
                    >
                      <Upload size={16} />
                      Import Records
                    </button>
                    <button
                      onClick={exportToMarkdown}
                      disabled={entries.length === 0}
                      className="flex-1 py-3 px-4 border-2 border-[#333] hover:border-primary disabled:opacity-40 disabled:hover:border-[#333] text-primary font-mono uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <FileText size={16} />
                      Export Markdown
                    </button>
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={importEntries}
                    className="hidden"
                  />
                  {backupStatus && (
                    <p className="mt-4 text-[10px] font-mono uppercase tracking-widest text-primary/70">
                      {backupStatus}
                    </p>
                  )}
                </div>

                <div className="mt-6 p-6 border border-[#333] bg-black/20">
                  <h4 className="text-[10px] font-mono uppercase text-[#666] mb-4 tracking-widest">Garden_Sync</h4>
                  <p className="text-xs font-mono text-[#999] leading-relaxed mb-4">Garden keeps the GitHub credential. Sterling keeps only a revocable journal-sync key.</p>
                  <div className="space-y-3">
                    <input value={gardenUrl} onChange={(event) => setGardenUrl(event.target.value)} placeholder="https://your-garden.example.com" className="w-full p-3 bg-black border border-[#333] text-primary text-xs font-mono outline-none focus:border-primary" />
                    <input value={gardenSyncKey} onChange={(event) => setGardenSyncKey(event.target.value)} type="password" placeholder="Garden sync key" className="w-full p-3 bg-black border border-[#333] text-primary text-xs font-mono outline-none focus:border-primary" />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={saveGardenSyncSettings} className="flex-1 py-3 px-4 border-2 border-[#333] hover:border-primary text-primary font-mono uppercase text-xs tracking-widest">Save Connection</button>
                      <button onClick={syncToGarden} disabled={entries.length === 0} className="flex-1 py-3 px-4 bg-primary text-black font-mono font-bold uppercase text-xs tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"><CloudUpload size={16} /> Sync to Garden</button>
                    </div>
                    {gardenSyncStatus && <p className="text-[10px] font-mono uppercase tracking-widest text-primary/70">{gardenSyncStatus}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="mt-24 pt-8 border-t border-[#1a1a1a] flex justify-between items-center opacity-20 text-[10px] font-mono uppercase tracking-widest">
        <span>© 2022-2029 Protocol</span>
        <div className="flex gap-4">
          <span>Encrypted</span>
        </div>
      </footer>
    </div>
  );
}

const isMoodEntry = (entry: unknown): entry is MoodEntry => {
  if (!entry || typeof entry !== 'object') return false;

  const candidate = entry as Partial<MoodEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.mood === 'number' &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every((tag) => typeof tag === 'string') &&
    typeof candidate.note === 'string'
  );
};

const parseBackupEntries = (data: unknown) => {
  const candidateEntries = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { entries?: unknown }).entries)
      ? (data as { entries: unknown[] }).entries
      : [];

  return candidateEntries.filter(isMoodEntry);
};

const mergeEntries = (currentEntries: MoodEntry[], importedEntries: MoodEntry[]) => {
  const byId = new Map<string, MoodEntry>();

  for (const entry of currentEntries) {
    byId.set(entry.id, entry);
  }

  for (const entry of importedEntries) {
    byId.set(entry.id, entry);
  }

  return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
};

const formatDateInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const createVaultFile = (entries: MoodEntry[]): VaultFile => ({
  version: 1,
  entries,
});

const escapeMarkdownCell = (value: string) => (
  value
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
);
