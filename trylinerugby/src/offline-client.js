/* Optional browser installation and cached play. No automatic reloads. */
const offlineApp = { started:false, home:false, ready:false, readinessRequest:0, prompt:null, waiting:null, requested:false, requestedWorker:null, changed:false, reloaded:false };
function offlineRender() {
  const bar = $('app-tools'), install = $('b-install'), update = $('b-update'), status = $('offline-status');
  if (!bar || !install || !update || !status) return;
  install.hidden = !offlineApp.prompt;
  update.hidden = !offlineApp.waiting && !offlineApp.requested;
  update.disabled = offlineApp.requested;
  update.textContent = offlineApp.requested ? 'Updating…' : 'Update Game';
  status.hidden = !offlineApp.ready;
  bar.hidden = !offlineApp.home || (install.hidden && update.hidden && status.hidden);
}
function offlineReload() {
  if (!offlineApp.home || !offlineApp.requested || !offlineApp.changed || offlineApp.reloaded) return;
  offlineApp.reloaded = true;
  window.location.reload();
}
function offlineScreen(id) {
  // Leaving home while activation is pending defers the reload until home returns.
  offlineApp.home = id === 's-home';
  offlineRender();
  offlineReload();
}
function offlineReady(worker) {
  if (!worker || typeof MessageChannel === 'undefined') return;
  const request = ++offlineApp.readinessRequest;
  const channel = new MessageChannel();
  const timer = setTimeout(() => { channel.port1.close(); }, 4000);
  channel.port1.onmessage = event => {
    clearTimeout(timer); channel.port1.close();
    if (request === offlineApp.readinessRequest && event.data && event.data.type === 'OFFLINE_READY' && typeof event.data.ready === 'boolean') {
      offlineApp.ready = event.data.ready; offlineRender();
    }
  };
  try { worker.postMessage({ type:'OFFLINE_STATUS' }, [channel.port2]); }
  catch (e) { clearTimeout(timer); channel.port1.close(); }
}
function offlineRegistration(registration) {
  const refresh = () => {
    offlineApp.waiting = registration.waiting || null;
    offlineRender();
    offlineReady(registration.active);
  };
  const watch = worker => {
    if (!worker || typeof worker.addEventListener !== 'function') return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated') refresh();
    });
  };
  refresh(); watch(registration.installing); watch(registration.waiting);
  registration.addEventListener('updatefound', () => watch(registration.installing));
}
function offlineStart() {
  if (offlineApp.started) return;
  offlineApp.started = true;
  const install = $('b-install'), update = $('b-update');
  if (install) install.addEventListener('click', () => {
    const go = async () => {
      const prompt = offlineApp.prompt;
      if (!prompt) return;
      offlineApp.prompt = null; offlineRender();
      try { await prompt.prompt(); await prompt.userChoice; } catch (e) { /* browser dismissed or unavailable */ }
    };
    if (typeof parentGate === 'function') parentGate(go); else go();   // a grown-up check first (kids.js): installing hands over to the browser
  });
  if (update) update.addEventListener('click', () => {
    if (!offlineApp.home || !offlineApp.waiting || offlineApp.requested) return;
    offlineApp.requested = true; offlineApp.requestedWorker = offlineApp.waiting; offlineApp.changed = false; offlineRender();
    try { offlineApp.waiting.postMessage({ type:'SKIP_WAITING' }); }
    catch (e) { offlineApp.requested = false; offlineRender(); }
  });
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('beforeinstallprompt', event => {
      if (typeof event.preventDefault !== 'function' || typeof event.prompt !== 'function') return;
      event.preventDefault(); offlineApp.prompt = event; offlineRender();
    });
    window.addEventListener('appinstalled', () => { offlineApp.prompt = null; offlineRender(); });
  }
  if (!window.isSecureContext || typeof navigator === 'undefined' || !navigator.serviceWorker || typeof navigator.serviceWorker.register !== 'function') return;
  const workers = navigator.serviceWorker;
  workers.addEventListener('controllerchange', () => {
    if (offlineApp.requested && workers.controller === offlineApp.requestedWorker) { offlineApp.changed = true; offlineReload(); }
    offlineReady(workers.controller);
  });
  try {
    Promise.resolve(workers.register('./sw.js')).then(offlineRegistration).catch(() => {});
  } catch (e) { /* online play remains available */ }
}
