import { useState } from 'react';

export async function clearLocalCache(storage = window.caches) {
  if (!storage) return { supported: false, deleted: 0 };
  const names = (await storage.keys()).filter((name) => name.startsWith('tierra-mate-'));
  const results = await Promise.all(names.map((name) => storage.delete(name)));
  return { supported: true, deleted: results.filter(Boolean).length };
}

export function CacheMaintenance() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function clear() {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await clearLocalCache();
      setMessage(!result.supported ? 'Este navegador no permite limpiar cachés desde la aplicación.'
        : result.deleted ? `Se eliminaron ${result.deleted} cachés locales de Tierra Mate.`
          : 'No hay cachés locales de Tierra Mate para eliminar.');
    } catch { setError('No se pudo limpiar la caché. Intentá nuevamente.'); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel admin-settings cache-maintenance" aria-labelledby="cache-title">
    <h2 id="cache-title">Caché y recarga</h2>
    <p>Limpiá los archivos temporales que Tierra Mate haya guardado en este navegador. Conservamos tu sesión y el carrito.</p>
    <p className="form-hint">Esta acción no borra la caché HTTP del navegador, del servidor ni de otros visitantes. Si no hay archivos temporales, podés recargar la página para consultar los datos nuevamente.</p>
    <div className="form-actions"><button className="button button--outline" type="button" onClick={clear} disabled={busy}>{busy ? 'Limpiando…' : 'Limpiar caché local'}</button><button className="button button--primary" type="button" onClick={() => window.location.reload()}>Recargar página</button></div>
    {message && <p role="status" className="form-success">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
