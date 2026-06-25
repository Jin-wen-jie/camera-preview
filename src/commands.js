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
    count: 180,
    columns: 60,
    fallBase: 3800,
    fallRange: 2800
  },
  {
    label: '雪',
    phrases: ['雪', '下雪', '雪花', '雪景', '飘雪'],
    key: 'snow',
    className: 'voice-effect voice-effect--falling-snow',
    glyphs: ['❄️', '❄️', '❅', '❆', '✨', '❄️'],
    count: 120,
    columns: 40,
    fallBase: 4000,
    fallRange: 3000
  },
  {
    label: '爱心',
    phrases: ['心', '爱心', '喜欢', '爱你', '比心'],
    key: 'heart',
    className: 'voice-effect voice-effect--falling-heart',
    glyphs: ['❤️', '💕', '💗', '💖', '♥'],
    count: 56,
    columns: 20,
    fallBase: 4000,
    fallRange: 2200
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
