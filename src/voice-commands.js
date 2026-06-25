import { normalize } from './utils.js';

const COMMANDS = [
  {
    label: '花',
    phrases: ['花', '花雨', '花海', '浪漫', '好看'],
    type: 'effect',
    key: 'flower'
  },
  {
    label: '清除',
    phrases: ['清除', '清屏', '关闭', '没了', '去掉'],
    type: 'clear-effects'
  }
];

export function parseVoiceCommand(text) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  for (const command of COMMANDS) {
    for (const phrase of command.phrases) {
      if (normalizedText.includes(phrase)) {
        return {
          label: command.label,
          type: command.type,
          key: command.key || null
        };
      }
    }
  }

  return null;
}
