'use strict';

// NAFRI OGA Studio: provider selection independent from any paid API.
// Providers are explicit adapters registered at runtime, not implicit promises.
const VALID_KINDS = new Set(['image', 'video', 'audio', 'transcription', 'editing']);
const VALID_MODES = new Set(['local', 'remote-free']);
const providers = new Map();

function registerProvider(provider) {
  if (!provider || typeof provider !== 'object') throw new TypeError('Provider required');
  const { id, kind, mode, check, generate } = provider;
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid provider ID');
  if (!VALID_KINDS.has(kind)) throw new Error('Unsupported provider kind');
  if (!VALID_MODES.has(mode)) throw new Error('Paid or unknown provider mode forbidden');
  if (typeof check !== 'function' || typeof generate !== 'function') throw new TypeError('Provider needs check and generate');
  if (providers.has(id)) throw new Error('Duplicate provider ID');
  providers.set(id, Object.freeze({ id, kind, mode, check, generate }));
}

function listProviders(kind) {
  return [...providers.values()].filter(p => !kind || p.kind === kind)
    .map(({ id, kind: k, mode }) => ({ id, kind: k, mode }));
}

async function generateFree(kind, params, options = {}) {
  if (!VALID_KINDS.has(kind)) throw new Error('Unsupported media kind');
  const { allowRemote = false } = options;
  const matching = [...providers.values()].filter(p => p.kind === kind && (p.mode === 'local' || allowRemote));
  // Local first: remote services must be explicitly opted into.
  matching.sort((a, b) => Number(a.mode !== 'local') - Number(b.mode !== 'local'));
  const failures = [];
  for (const provider of matching) {
    try {
      const status = await provider.check();
      if (!status || status.available !== true || status.free !== true) {
        failures.push({ id: provider.id, reason: 'Unavailable or zero-cost status not verified' });
        continue;
      }
      const result = await provider.generate(params);
      if (result == null) throw new Error('Empty generation result');
      return { providerId: provider.id, result };
    } catch (err) {
      failures.push({ id: provider.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  const error = new Error('No verified free provider is currently available');
  error.failures = failures;
  throw error;
}

function clearProvidersForTests() {
  providers.clear();
}

module.exports = { registerProvider, listProviders, generateFree, clearProvidersForTests };
