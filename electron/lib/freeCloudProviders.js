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
  Object.freeze({
    id: 'qwen-image-21',
    label: 'Qwen Image 2.1 — generación y edición',
    url: 'https://huggingface.co/spaces/Qwen/Qwen-Image-2.1',
    capabilities: Object.freeze(['image', 'image-editing']),
    mode: 'browser',
    billing: 'free-quota',
    requiresAccount: false,
    note: 'Demo oficial en ZeroGPU para uso experimental. ATENCIÓN: el modelo Qwen-Image-2.1 tiene licencia de investigación; no utilizar comercialmente sin autorización. GPU con cuota compartida.',
  }),
  Object.freeze({
    id: 'qwen-image-edit-2511',
    label: 'Qwen Image Edit 2511 — edición con referencias',
    url: 'https://huggingface.co/spaces/Qwen/Qwen-Image-Edit-2511',
    capabilities: Object.freeze(['image-editing']),
    mode: 'browser',
    billing: 'free-quota',
    requiresAccount: false,
    note: 'Demo oficial ZeroGPU de edición por instrucciones; modelo Qwen Image Edit 2511 bajo Apache-2.0. Revisar condiciones del Space y evaluar fidelidad real.',
  }),
  Object.freeze({
    id: 'wan22-video-fast',
    label: 'Wan 2.2 14B Fast — imagen a vídeo',
    url: 'https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster',
    capabilities: Object.freeze(['video', 'image-to-video']),
    mode: 'browser',
    billing: 'free-quota',
    requiresAccount: false,
    note: 'Demo en ZeroGPU para animar una imagen con instrucciones. La generación puede agotar la cuota diaria y está sujeta a colas.',
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
