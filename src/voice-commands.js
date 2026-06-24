const COMMANDS = [
  {
    type: 'effect',
    effect: 'flower',
    label: '开花',
    phrases: ['开花', '一朵花', '放花', '花朵', '头上花']
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
