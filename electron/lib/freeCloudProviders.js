'use strict';

// Curated browser-based providers only. No paid API, tokens, metered calls,
// automatic file uploads, or hidden cloud generation.
const PROVIDERS = Object.freeze([
  Object.freeze({
    id: 'huggingface-zerogpu',
    label: 'Hugging Face ZeroGPU',
    url: 'https://huggingface.co/spaces/enzostvs/zero-gpu-spaces',
    capabilities: Object.freeze(['image', 'image-editing', 'video']),
    mode: 'browser',
    billing: 'free-quota',
    requiresAccount: false,
    note: 'Individual Spaces vary in availability, model licence and usage quota. Free account: currently 5 GPU minutes per day. Check each Space before uploading images.',
  }),
]);

function listFreeCloudProviders() {
  return PROVIDERS.map(p => ({
    ...p,
    capabilities: [...p.capabilities],
  }));
}

async function openFreeCloudProvider(id, openExternal) {
  const provider = PROVIDERS.find(p => p.id === id);
  if (!provider) throw new Error('Unknown or unapproved free cloud provider');
  if (typeof openExternal !== 'function') throw new TypeError('Missing external URL handler');
  // Never trust renderer-provided URLs. Only navigate to our fixed allowlist.
  const url = new URL(provider.url);
  if (url.protocol !== 'https:' || url.hostname !== 'huggingface.co') {
    throw new Error('Provider URL not approved');
  }
  await openExternal(url.href);
  return { ok: true, providerId: provider.id, mode: 'browser' };
}

module.exports = { listFreeCloudProviders, openFreeCloudProvider };
