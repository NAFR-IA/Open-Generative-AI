'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { registerProvider, listProviders, generateFree, clearProvidersForTests } = require('../electron/lib/nafriEngineRegistry');

test.beforeEach(() => clearProvidersForTests());

test('rejects paid or unknown provider types', () => {
  assert.throws(() => registerProvider({ id:'paid', kind:'video', mode:'paid', check:async()=>({available:true,free:true}), generate:async()=>true }), /forbidden/);
});

test('prefers local providers even if remote is registered first', async () => {
  const calls = [];
  registerProvider({ id:'remote', kind:'image', mode:'remote-free', check:async()=>({available:true,free:true}), generate:async()=>{calls.push('remote');return 'remote';} });
  registerProvider({ id:'local', kind:'image', mode:'local', check:async()=>({available:true,free:true}), generate:async()=>{calls.push('local');return 'local';} });
  const result = await generateFree('image', {}, { allowRemote:true });
  assert.equal(result.providerId, 'local');
  assert.deepEqual(calls, ['local']);
});

test('remote provider requires explicit permission', async () => {
  registerProvider({ id:'remote', kind:'video', mode:'remote-free', check:async()=>({available:true,free:true}), generate:async()=>({url:'example'}) });
  await assert.rejects(generateFree('video', {}), /No verified free provider/);
  assert.equal((await generateFree('video', {}, {allowRemote:true})).providerId, 'remote');
});

test('refuses unverified free service and fails safely', async () => {
  registerProvider({ id:'unverified', kind:'audio', mode:'remote-free', check:async()=>({available:true}), generate:async()=>{throw Error('Must never run');} });
  await assert.rejects(generateFree('audio', {}, {allowRemote:true}), e => e.failures[0].reason.includes('not verified'));
});

test('falls back when a local engine is offline', async () => {
  registerProvider({id:'local',kind:'image',mode:'local',check:async()=>({available:false,free:true}),generate:async()=>null});
  registerProvider({id:'fallback',kind:'image',mode:'remote-free',check:async()=>({available:true,free:true}),generate:async()=>({image:'ok'})});
  assert.equal((await generateFree('image', {}, {allowRemote:true})).providerId,'fallback');
  assert.equal(listProviders('image').length,2);
});
