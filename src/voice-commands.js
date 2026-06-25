const COMMANDS = [
  {
    type: 'effect',
    effect: 'flower',
    label: '花海',
    exactPhrases: ['花'],
    phrases: ['花', '花雨', '花海', '浪漫', '好看']
  },
  {
    type: 'clear-effects',
    label: '清除特效',
    phrases: ['清除特效', '清空特效', '清空画面', '不要特效', '恢复正常']
  },
  {
    type: 'camera-view',
    view: 'large',
    label: '放大画面',
    phrases: ['放大画面', '画面放大', '摄像头放大', '变大一点', '放大一点']
  },
  {
    type: 'camera-view',
    view: 'normal',
    label: '恢复大小',
    phrases: ['恢复画面大小', '恢复大小', '正常大小', '缩小一点', '画面缩小']
  },
  {
    type: 'caption-visibility',
    visible: false,
    label: '隐藏字幕',
    phrases: ['隐藏字幕', '不要字幕', '关掉字幕']
  },
  {
    type: 'caption-visibility',
    visible: true,
    label: '显示字幕',
    phrases: ['显示字幕', '打开字幕', '我要字幕']
  }
];

import { normalize } from './utils.js';

export function parseVoiceCommand(text) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  const command = COMMANDS.find(({ exactPhrases = [], phrases }) => (
    exactPhrases.some((phrase) => normalizedText === phrase)
      || phrases.some((phrase) => normalizedText.includes(phrase))
  ));

  if (!command) return null;
  const { exactPhrases, phrases, ...result } = command;

  if (result.type === 'effect' && normalizedText === '花') {
    return { ...result, label: '花' };
  }

  return result;
}
