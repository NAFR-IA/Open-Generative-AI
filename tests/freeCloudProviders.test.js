'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { listFreeCloudProviders, openFreeCloudProvider } = require('../electron/lib/freeCloudProviders');

test('registry contains only explicit free-quota browser providers', () => {
  const providers = listFreeCloudProviders();
  assert.ok(providers.length >= 1);
  for (const provider of providers) {
    assert.equal(provider.mode, 'browser');
    assert.equal(provider.billing, 'free-quota');
    assert.equal(new URL(provider.url).protocol, 'https:');
  }
});

test('rejects unknown provider without opening anything', async () => {
  let calls = 0;
  await assert.rejects(
    openFreeCloudProvider('https://billing.example.com', async () => { calls++; }),
    /Unknown or unapproved/
  );
  assert.equal(calls, 0);
});

test('opens only the approved URL and sends no user input', async () => {
  const opened = [];
  const result = await openFreeCloudProvider('huggingface-zerogpu', async url => opened.push(url));
  assert.equal(result.ok, true);
  assert.deepEqual(opened, ['https://huggingface.co/spaces/enzostvs/zero-gpu-spaces']);
});

test('registry copies are not mutable shared objects', () => {
  const p = listFreeCloudProviders();
  p[0].capabilities.push('paid-service');
  p[0].label = 'altered';
  assert.notEqual(listFreeCloudProviders()[0].label, 'altered');
  assert.equal(listFreeCloudProviders()[0].capabilities.includes('paid-service'), false);
});
