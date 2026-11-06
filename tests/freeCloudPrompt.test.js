'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePrompt, MAX_PROMPT_LENGTH } = require('../electron/lib/freeCloudPrompt');
test('accepts a valid user prompt without mutating it', () => {
  assert.equal(validatePrompt('castillo cinematográfico, alta calidad'), 'castillo cinematográfico, alta calidad');
});
test('rejects non-text inputs and oversized payloads', () => {
  assert.throws(() => validatePrompt({ secret: 'no' }), /string/);
  assert.throws(() => validatePrompt('x'.repeat(MAX_PROMPT_LENGTH + 1)), /long/);
});
test('rejects embedded null bytes', () => {
  assert.throws(() => validatePrompt('a\0b'), /control/);
});
test('accepts boundary-length text', () => {
  assert.equal(validatePrompt('x'.repeat(MAX_PROMPT_LENGTH)).length, MAX_PROMPT_LENGTH);
});
