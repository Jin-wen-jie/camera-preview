const COMMANDS = [
  {
    type: 'effect',
    effect: 'flower',
    label: '花',
    phrases: ['花']
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
