/** Muscle name → SVG region ID mapping and color utilities */

export const MUSCLE_REGIONS = {
  front: [
    'Грудь', 'Плечи', 'Бицепс', 'Предплечья', 'Пресс', 'Квадрицепс', 'Икры',
  ],
  back: [
    'Спина', 'Трапеция', 'Трицепс', 'Ягодицы', 'Бицепс бедра', 'Икры',
  ],
};

export const MUSCLE_TO_ID = {
  'Грудь': 'chest',
  'Спина': 'back',
  'Плечи': 'shoulders',
  'Бицепс': 'biceps',
  'Трицепс': 'triceps',
  'Предплечья': 'forearms',
  'Пресс': 'abs',
  'Квадрицепс': 'quads',
  'Бицепс бедра': 'hamstrings',
  'Икры': 'calves',
  'Ягодицы': 'glutes',
  'Трапеция': 'traps',
};

export const ID_TO_MUSCLE = Object.fromEntries(
  Object.entries(MUSCLE_TO_ID).map(([k, v]) => [v, k]),
);

const LOW = { r: 0xee, g: 0xf2, b: 0xeb };   // #eef2eb  olive-bg
const HIGH = { r: 0xc4, g: 0x70, b: 0x4b };   // #c4704b  terra

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/**
 * Returns a CSS color for a given load relative to maxLoad.
 * 0 → #e5e5e5 (gray), then gradient from olive-bg → terra.
 */
export function getHeatColor(load, maxLoad = 20) {
  if (!load || load <= 0) return '#e5e5e5';
  const t = Math.min(load / maxLoad, 1);
  const r = lerp(LOW.r, HIGH.r, t);
  const g = lerp(LOW.g, HIGH.g, t);
  const b = lerp(LOW.b, HIGH.b, t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Build highlights object from muscle-load data array.
 * @param {Array<{muscle_name:string, total_load:number}>} data
 * @returns {{ [muscleName]: { color: string, opacity: number } }}
 */
export function buildHeatHighlights(data) {
  if (!data?.length) return {};
  const maxLoad = Math.max(...data.map((d) => d.total_load), 1);
  const highlights = {};
  for (const { muscle_name, total_load } of data) {
    highlights[muscle_name] = {
      color: getHeatColor(total_load, maxLoad),
      opacity: total_load > 0 ? 0.6 + 0.4 * Math.min(total_load / maxLoad, 1) : 0.3,
    };
  }
  return highlights;
}
