import { useEffect, useRef, useState } from 'react';
import artwork from '../assets/mate-ilustrado.webp';

export function MateScene() {
  const host = useRef(null);
  const [mode, setMode] = useState('illustration');
  const requested = mode === 'loading' || mode === 'model';

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    let dispose;
    import('./three/createMateScene.js').then(({ createMateScene }) => {
      if (cancelled) return;
      dispose = createMateScene(host.current, () => setMode('unavailable'));
      setMode('model');
    }).catch(() => { if (!cancelled) setMode('unavailable'); });
    return () => { cancelled = true; dispose?.(); };
  }, [requested]);

  return <figure className={`mate-scene ${mode === 'model' ? 'mate-scene--ready' : ''}`}>
    <div className="mate-scene__stage">
      <div className="mate-scene__portrait">
        <img src={artwork} alt="Mate de madera ilustrado con bombilla curva" className="mate-scene__fallback" fetchPriority="high" />
        <svg className="mate-scene__steam" viewBox="0 0 80 100" aria-hidden="true" fill="none">
          <path pathLength="1" d="M30 98 C50 73 9 71 32 42 S40 15 33 4" />
          <path pathLength="1" d="M49 96 C70 70 34 61 53 36 S61 15 60 9" />
        </svg>
      </div>
    </div>
    <div ref={host} className="mate-scene__canvas" aria-hidden="true" />
    <figcaption className="mate-scene__caption">
      <span aria-live="polite">{mode === 'model' ? 'Modelo ilustrativo' : mode === 'unavailable' ? 'Vista 3D no disponible' : 'Ilustración de Tierra Mate'}</span>
      {window.WebGL2RenderingContext && mode !== 'unavailable' && <button className="mate-scene__switch" type="button"
        aria-busy={mode === 'loading'} onClick={() => setMode(requested ? 'illustration' : 'loading')}>
        {mode === 'loading' ? 'Cancelar carga' : mode === 'model' ? 'Ver ilustración' : 'Explorar en 3D'}
      </button>}
    </figcaption>
  </figure>;
}
