// NAFRI OGA Studio — local-first zero-cost generation page.
// Uses the Electron preload; the browser-only version displays a clear limitation.
export function NafriStudio() {
  const root = document.createElement('section');
  root.className = 'w-full h-full overflow-auto p-6 text-white';
  root.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 class="text-2xl font-bold">NAFRI OGA Studio · Motores gratuitos</h1>
        <p class="text-sm text-gray-400 mt-2">Generación local de imágenes y vídeos. No se llaman API de pago.</p>
      </div>
      <div id="nafri-status" class="rounded-lg bg-white/5 border border-white/10 p-4 text-sm">Comprobando motores…</div>
      <div class="rounded-lg bg-white/5 border border-white/10 p-4 space-y-4">
        <label class="block text-sm">Tipo
          <select id="nafri-kind" class="block mt-1 w-full p-2 bg-gray-900 border border-gray-700 rounded">
            <option value="image">Imagen</option><option value="video">Vídeo</option>
          </select>
        </label>
        <label class="block text-sm">Modelo disponible
          <select id="nafri-model" class="block mt-1 w-full p-2 bg-gray-900 border border-gray-700 rounded"></select>
        </label>
        <label class="block text-sm">Descripción
          <textarea id="nafri-prompt" rows="4" maxlength="4000" placeholder="Describe lo que quieres crear"
            class="block mt-1 w-full p-3 bg-gray-900 border border-gray-700 rounded"></textarea>
        </label>
        <div class="flex gap-3 flex-wrap">
          <button id="nafri-run" class="px-4 py-2 bg-blue-600 rounded font-semibold disabled:opacity-40">Generar gratis</button>
          <button id="nafri-refresh" class="px-4 py-2 bg-gray-700 rounded">Comprobar motores</button>
          <button id="nafri-settings" class="px-4 py-2 bg-gray-700 rounded">Instalar modelos / Ajustes</button>
        </div>
        <p id="nafri-message" class="text-sm text-gray-300" role="status"></p>
      </div>
      <div id="nafri-result" class="rounded-lg bg-white/5 border border-white/10 p-4" aria-live="polite"></div>
    </div>`;
  const $ = id => root.querySelector('#'+id);
  const kind=$('nafri-kind'), model=$('nafri-model'), run=$('nafri-run');
  let providers=[];
  function updateModels() {
    model.replaceChildren();
    const chosen=providers.find(p => p.kind===kind.value);
    for(const m of chosen?.models || []) {
      const opt=document.createElement('option'); opt.value=m.id; opt.textContent=m.name; model.appendChild(opt);
    }
    run.disabled = !chosen?.available || !model.value;
    if (!chosen?.available) $('nafri-message').textContent = chosen?.message || 'Este motor no está listo. Instala sus modelos desde Ajustes.';
  }
  async function refresh() {
    run.disabled=true;
    $('nafri-status').textContent='Comprobando…';
    if (!window.localAI?.nafri) {
      $('nafri-status').textContent='Abre la aplicación de escritorio (.exe) para ejecutar motores locales.';
      return;
    }
    try {
      providers=await window.localAI.nafri.providers();
      $('nafri-status').replaceChildren();
      providers.forEach(p=>{
        const line=document.createElement('p');
        line.textContent = (p.available?'✓ Disponible: ':'○ No disponible: ')+p.id+(p.message?' — '+p.message:'');
        $('nafri-status').appendChild(line);
      });
      updateModels();
    } catch(err){$('nafri-status').textContent='No se pudieron comprobar los motores: '+err.message;}
  }
  kind.addEventListener('change',updateModels);
  $('nafri-refresh').addEventListener('click',refresh);
  $('nafri-settings').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('navigate',{detail:{page:'settings'}})));
  $('nafri-run').addEventListener('click',async()=>{
    const prompt=$('nafri-prompt').value.trim();
    if(!prompt){$('nafri-message').textContent='Escribe una descripción.';return;}
    if(!model.value)return;
    run.disabled=true;
    $('nafri-message').textContent='Generando con motor local…';
    $('nafri-result').replaceChildren();
    try{
      const output=await window.localAI.nafri.generate(kind.value,{model:model.value,prompt,aspect_ratio:'1:1'});
      const result=output.result;
      const media=document.createElement(kind.value==='video'?'video':'img');
      // Results come from trusted local engine IPC. Only local file and image-data URLs are accepted.
      const url=result?.url || '';
      if(!url.startsWith('data:image/') && !url.startsWith('file://')) throw Error('Unexpected media result URL');
      media.src=url;
      media.style.cssText='max-width:100%;max-height:65vh;border-radius:10px';
      if(kind.value==='video'){media.controls=true;media.autoplay=false;}
      $('nafri-result').appendChild(media);
      $('nafri-message').textContent='Generación completada con '+output.providerId;
    }catch(err){$('nafri-message').textContent='No se pudo generar: '+err.message;}
    finally{run.disabled=false;}
  });
  refresh();
  return root;
}
