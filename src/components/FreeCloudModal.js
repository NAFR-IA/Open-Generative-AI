// Manual zero-cost cloud handoff. Never uploads media or calls a paid API.
export function FreeCloudModal() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-5';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Opciones gratuitas en la nube');

  const panel = document.createElement('section');
  panel.className = 'bg-[#171717] text-white rounded-xl border border-white/20 max-w-xl w-full p-6 space-y-4';
  const title = document.createElement('h2');
  title.className = 'text-xl font-bold';
  title.textContent = 'OGA — Nube gratuita (0 €)';
  const explanation = document.createElement('p');
  explanation.className = 'text-sm text-white/70';
  explanation.textContent = 'Accede a demos con GPU compartida. Abren el navegador: no hay generación automática en OGA, ni se envían tus imágenes. Las cuotas, colas y licencias dependen de cada servicio.';
  const close = document.createElement('button');
  close.className = 'px-3 py-2 rounded bg-white/10 hover:bg-white/20';
  close.textContent = 'Cerrar';
  close.onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  const items = document.createElement('div');
  items.className = 'space-y-3';

  panel.append(title, explanation, items, close);
  overlay.append(panel);

  if (!window.localAI?.freeCloud) {
    const msg = document.createElement('p');
    msg.className = 'text-amber-300 text-sm';
    msg.textContent = 'El catálogo gratuito solo está disponible en la versión de escritorio de OGA.';
    items.append(msg);
    return overlay;
  }

  window.localAI.freeCloud.list().then(providers => {
    if (!providers.length) {
      items.textContent = 'No hay proveedores gratuitos verificados.';
      return;
    }
    for (const provider of providers) {
      const row = document.createElement('div');
      row.className = 'rounded-lg border border-white/10 bg-white/5 p-4 space-y-2';
      const name = document.createElement('div');
      name.className = 'font-semibold';
      name.textContent = provider.label;
      const info = document.createElement('p');
      info.className = 'text-xs text-white/60';
      info.textContent = provider.note;
      const button = document.createElement('button');
      button.className = 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold hover:bg-teal-500';
      button.textContent = 'Abrir catálogo gratuito';
      button.onclick = async () => {
        button.disabled = true;
        try { await window.localAI.freeCloud.open(provider.id); }
        catch (err) { alert('No se pudo abrir el proveedor: ' + err.message); }
        finally { button.disabled = false; }
      };
      row.append(name, info, button);
      items.append(row);
    }
  }).catch(err => { items.textContent = 'Error consultando el catálogo: ' + err.message; });
  return overlay;
}
