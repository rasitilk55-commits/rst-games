// Arayüz simgeleri (satır içi SVG, dosya gerekmez). Renk currentColor'dan gelir.
const svg = (body) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  gift: svg('<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12"/><path d="M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>'),
  road: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  bag: svg('<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  crown: svg('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z"/>'),
  chest: svg('<rect x="3" y="10" width="18" height="10" rx="2"/><path d="M3 10a9 5 0 0 1 18 0"/><path d="M11 13h2v3h-2z"/>'),
  play: svg('<path d="M7 5l12 7-12 7V5z"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  check: svg('<path d="M5 12l5 5 9-10"/>'),
  slow: svg('<path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 22c0-4-10-4-10-10"/>'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
  guide: svg('<circle cx="6" cy="18" r="3"/><path d="M8.5 15.5L20 4" stroke-dasharray="2 3"/><circle cx="19" cy="5" r="2"/>'),
  pocket: svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h2M18 12h2M12 4v2M12 18v2"/>'),
  bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>'),
};
export const icon = (name) => ICONS[name] || ICONS.bolt;
