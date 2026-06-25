// Single source of truth: voice commands + effect rendering parameters
// Both voice-commands.js and effects.js import from here

export const EFFECT_COMMANDS = [
  {
    // ── Voice command matching ──
    label: '花',
    phrases: ['花', '花雨', '花海', '浪漫', '好看', '花瓣'],
    // ── Effect rendering ──
    key: 'flower',
    className: 'voice-effect voice-effect--falling-flower',
    glyphs: ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹', '💮', '🪷', '💐', '🌸', '🌺', '🌷', '🌹'],
    count: 120,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  },
  {
    label: '雪',
    phrases: ['雪', '下雪', '雪花', '雪景', '飘雪'],
    key: 'snow',
    className: 'voice-effect voice-effect--falling-snow',
    glyphs: ['❄️', '❄️', '❅', '❆', '✨', '❄️'],
    count: 100,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  },
  {
    label: '爱心',
    phrases: ['心', '爱心', '喜欢', '爱你', '比心'],
    key: 'heart',
    className: 'voice-effect voice-effect--falling-heart',
    glyphs: ['❤️', '💕', '💗', '💖', '♥'],
    count: 80,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  },
  {
    label: '星星',
    phrases: ['星星', '星空', '星', '闪烁', '流星'],
    key: 'star',
    className: 'voice-effect voice-effect--falling-star',
    glyphs: ['✨', '⭐', '🌟', '💫', '⭐', '✨'],
    count: 90,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  },
  {
    label: '落叶',
    phrases: ['落叶', '叶子', '秋', '秋天', '枫叶'],
    key: 'leaf',
    className: 'voice-effect voice-effect--falling-leaf',
    glyphs: ['🍂', '🍁', '🌿', '🍃', '🍂', '🍁', '🌾'],
    count: 80,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  },
  {
    label: '泡泡',
    phrases: ['泡泡', '气泡', '泡沫', '梦幻', '水'],
    key: 'bubble',
    className: 'voice-effect voice-effect--float-bubble',
    glyphs: ['🫧', '🫧', '💧', '🫧', '🫧'],
    count: 70,
    columns: 35,
    fallBase: 4200,
    fallRange: 2500
  }
];

export const CLEAR_COMMAND = {
  label: '清除',
  phrases: ['清除', '清屏', '关闭', '没了', '去掉'],
  type: 'clear-effects'
};

export function findEffectByKey(key) {
  return EFFECT_COMMANDS.find((cmd) => cmd.key === key) || null;
}

export function findEffectByPhrase(text) {
  const normalized = String(text || '').replace(/\s+/g, '');
  if (!normalized) return null;
  for (const cmd of EFFECT_COMMANDS) {
    if (cmd.phrases.some((p) => normalized.includes(p))) {
      return cmd;
    }
  }
  return null;
}
