const COMMANDS = [
  {
    type: 'snapshot',
    label: '拍照',
    phrases: ['拍照', '截图', '照相', '拍一张']
  },
  {
    type: 'clear-effects',
    label: '清空特效',
    phrases: ['清屏', '清空特效', '清除特效', '取消特效']
  },
  {
    type: 'hide-captions',
    label: '隐藏字幕',
    phrases: ['隐藏字幕', '关闭字幕', '关掉字幕']
  },
  {
    type: 'show-captions',
    label: '显示字幕',
    phrases: ['显示字幕', '打开字幕', '开启字幕']
  },
  {
    type: 'camera-large',
    label: '放大摄像头',
    phrases: ['放大摄像头', '放大画面', '画面放大', '变大']
  },
  {
    type: 'camera-normal',
    label: '缩小摄像头',
    phrases: ['缩小摄像头', '缩小画面', '画面缩小', '恢复大小', '还原摄像头', '变小']
  },
  {
    type: 'effect',
    effect: 'flower',
    label: '开花',
    phrases: ['开花', '一朵花', '放花', '花朵', '头上花']
  },
  {
    type: 'effect',
    effect: 'snow',
    label: '下雪',
    phrases: ['下雪', '飘雪', '雪花']
  },
  {
    type: 'effect',
    effect: 'heart',
    label: '爱心',
    phrases: ['爱心', '比心', '红心', '心形']
  }
];

function normalize(text) {
  return String(text || '').replace(/\s+/g, '');
}

export function parseVoiceCommand(text) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  const command = COMMANDS.find(({ phrases }) => (
    phrases.some((phrase) => normalizedText.includes(phrase))
  ));

  if (!command) return null;
  const { phrases, ...result } = command;
  return result;
}
