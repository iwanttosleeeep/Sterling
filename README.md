# Sterling — 2029 // ACCESS GRANTED

A terminal-styled mood tracker that answers each entry with an *echo* — a fragment matched from a small offline archive of songs. Log how you feel, get a line back from Radiohead, Oasis, Arctic Monkeys, and friends. Fully offline, fully private, installable as a PWA.

Named after Sterling, one third of an AI team of three.

## What it does

- **Track** — pick a mood level (1–5), tag it (Melancholic, Caffeinated, Quarter-Life…), write a note. Hit *Fetch Echoes* and the archive scores all its records against your entry (mood distance, tag overlap and neighbor tags, note keywords, energy/valence) and returns the best-fitting song + echo, with a little randomness so it doesn't repeat itself.
- **Archive** — full history with search and mood/tag/date filters; entries can be edited or re-scanned for a new echo.
- **Stats** — mood-over-time chart.
- **Settings** — 12 terminal color themes, JSON backup export/import, Markdown export.

No accounts, no server, no analytics. Everything lives in `localStorage` on your device.

## Run locally

Prerequisite: Node.js 20+

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build` (production build to `dist/`), `npm run preview`, `npm run lint` (typecheck).

## Structure

```
src/
  App.tsx                    shell, tabs, archive filters, backup/export
  components/
    MoodTracker.tsx          entry form + echo fetching
    MoodChart.tsx            mood-over-time chart (lazy-loaded)
    Countdown.tsx            countdown widget
  data/
    archive.json             the offline song archive (46 records)
    lyricArchive.ts          scoring + matching logic
public/
  manifest.json, sw.js       PWA install + offline cache
```

## The archive

Each record in `archive.json` pairs a song with an `echo` (a short evocative line), mood levels, tags, keywords, and energy/valence values. The echoes are hand-written mood descriptions in the spirit of each song — not quoted lyrics. To grow the archive, add records following the same shape; `lyricArchive.ts` picks them up automatically.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Motion · Recharts · Lucide
