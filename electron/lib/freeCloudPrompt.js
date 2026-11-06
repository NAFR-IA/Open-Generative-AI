'use strict';
// Pure guard shared by Electron clipboard IPC and tests.
const MAX_PROMPT_LENGTH = 12000;
function validatePrompt(prompt) {
  if (typeof prompt !== 'string') throw new TypeError('Prompt must be a string');
  if (prompt.length > MAX_PROMPT_LENGTH) throw new RangeError('Prompt is too long');
  // Prevent copying invisible control characters into third-party demos.
  if (/\u0000/.test(prompt)) throw new TypeError('Prompt contains unsupported control characters');
  return prompt;
}
module.exports = { validatePrompt, MAX_PROMPT_LENGTH };
