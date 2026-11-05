'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const localAI = require('./localInference');
const wan = require('./wan2gpProvider');
const { registerProvider, listProviders, generateFree } = require('./nafriEngineRegistry');

function getWindow() { return BrowserWindow.getAllWindows()[0] || null; }

function register() {
  registerProvider({
    id: 'sd-cpp-image', kind: 'image', mode: 'local',
    check: async () => {
      const bin = await localAI.getBinaryStatus();
      const models = await localAI.listModels();
      const ready = models.some(m => m.state === 'downloaded' &&
        (!m.requiresAuxiliary || (m.auxiliaryStatus.llm === 'downloaded' && m.auxiliaryStatus.vae === 'downloaded')));
      return { available: !!bin.exists && ready, free: true,
        message: !bin.exists ? 'Install sd.cpp from Settings > Local Models' : !ready ? 'Download a compatible image model' : 'Ready' };
    },
    generate: params => localAI.generate(params, getWindow()),
  });
  registerProvider({
    id: 'wangp-local-video', kind: 'video', mode: 'local',
    check: async () => {
      const cfg = wan.readConfig();
      if (!cfg.dir) return { available: false, free: true, message: 'Select a Wan2GP local directory in Settings' };
      const status = await wan.check({ ...cfg, quick: true });
      return { available: status.ok === true, free: true, message: status.message || status.error || '' };
    },
    generate: params => {
      if (!wan.readConfig().dir) throw new Error('Local Wan2GP installation required');
      return wan.generate(params, getWindow());
    },
  });

  ipcMain.handle('nafri:providers', async () => {
    const definitions = listProviders();
    return Promise.all(definitions.map(async p => {
      try {
        const status = p.id === 'sd-cpp-image'
          ? await localAI.getBinaryStatus().then(async b => {
              const models = await localAI.listModels();
              const ready = models.filter(m => m.state === 'downloaded' &&
                (!m.requiresAuxiliary || (m.auxiliaryStatus.llm === 'downloaded' && m.auxiliaryStatus.vae === 'downloaded')));
              return { available: Boolean(b.exists && ready.length), binaryInstalled: Boolean(b.exists), models: ready.map(m=>({id:m.id,name:m.name})) };
            })
          : await (async () => {
              const cfg = wan.readConfig();
              if (!cfg.dir) return { available: false, message: 'Configure Wan2GP local folder' };
              const probe = await wan.check({...cfg, quick: true});
              const models = probe.ok ? (await wan.listModels()).filter(m=>m.ready).map(m=>({id:m.id,name:m.name})) : [];
              return { available: probe.ok && models.length>0, models, message: probe.message || probe.error || '' };
            })();
        return {...p, free: true, ...status};
      } catch (error) { return {...p, available:false, free:true, message:error.message}; }
    }));
  });
  ipcMain.handle('nafri:generate', async (_, kind, params) => {
    if (!params || typeof params !== 'object' || typeof params.prompt !== 'string' || !params.prompt.trim()) {
      throw new Error('Write a prompt first');
    }
    if (kind !== 'image' && kind !== 'video') throw new Error('No supported free engine for this media type');
    if (typeof params.model !== 'string' || !params.model) throw new Error('Select a model');
    return generateFree(kind, params, {allowRemote:false});
  });
}
module.exports = {register};
