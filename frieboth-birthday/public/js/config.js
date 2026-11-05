/**
 * Loads data/crew.json and normalises it.
 * Each reel lists one or more `sources`. The browser tries them in order,
 * so put the .mp4 first and the original .mov as a fallback.
 * Sources can also be full URLs (for example Supabase Storage public URLs).
 */
const TYPES = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm' };

function typeOf(src) {
  const ext = src.split('?')[0].split('.').pop().toLowerCase();
  // .mov gets no type on purpose: Chrome skips sources typed video/quicktime
  return TYPES[ext] ?? '';
}

export async function loadConfig() {
  const res = await fetch('data/crew.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load data/crew.json (${res.status})`);
  const cfg = await res.json();

  const groupLabel = Object.fromEntries(cfg.groups.map((g) => [g.id, g.label]));

  cfg.reels = cfg.reels.map((reel, index) => ({
    ...reel,
    index,
    groupLabel: groupLabel[reel.group] ?? '',
    sources: (reel.sources ?? [reel.file]).filter(Boolean).map((src) => ({ src, type: typeOf(src) })),
  }));

  return cfg;
}
