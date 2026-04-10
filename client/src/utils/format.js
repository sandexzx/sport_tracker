const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTH_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = DAY_NAMES[d.getDay()];
  const date = d.getDate();
  const month = MONTH_GENITIVE[d.getMonth()];
  return `${day}, ${date} ${month}`;
}

export function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return '';
  const ms = new Date(finishedAt) - new Date(startedAt);
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

export function formatVolume(volume) {
  const n = Math.round(volume);
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${formatted} кг`;
}

export function formatMonth(dateStr) {
  const d = new Date(dateStr);
  return `${MONTH_NOMINATIVE[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr);
  const date = d.getDate();
  const month = MONTH_GENITIVE[d.getMonth()];
  const year = d.getFullYear();
  return `${date} ${month} ${year}`;
}

export function toInputDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  return new Date(dateStr).toISOString().slice(0, 10);
}
