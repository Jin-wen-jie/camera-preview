import { normalize } from './utils.js';
import { EFFECT_COMMANDS, CLEAR_COMMAND } from './commands.js';

export function parseVoiceCommand(text) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  // Check clear commands first
  if (CLEAR_COMMAND.phrases.some((phrase) => normalizedText.includes(phrase))) {
    return {
      label: CLEAR_COMMAND.label,
      type: CLEAR_COMMAND.type,
      key: null
    };
  }

  // Check effect commands
  for (const cmd of EFFECT_COMMANDS) {
    if (cmd.phrases.some((phrase) => normalizedText.includes(phrase))) {
      return {
        label: cmd.label,
        type: 'effect',
        key: cmd.key
      };
    }
  }

  return null;
}
