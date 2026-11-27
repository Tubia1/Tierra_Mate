export function MateLoader({ label = 'Cargando…' }) {
  return (
    <div className="mate-loader" role="status">
      <svg viewBox="0 0 112 104" width="88" height="82" fill="none" aria-hidden="true">
        <g stroke="#503627" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Perfil, pañuelo y hombro de la persona. */}
          <path fill="#dfb28c" d="M39 53l3-12c-7-7-9-17-4-23 5-7 20-9 26-1 3 4 3 8 3 12l5 6-6 2-1 6c-1 5-6 7-12 6l-1 7z" />
          <path fill="#503627" d="M37 38c-9-4-11-15-5-22 4-6 11-7 17-6 9-5 18 0 20 8-5 4-12 5-20 4l-2 11c-3-5-8-3-7 1l1 6z" />
          <path d="M60 28h2m1 12 3-1" />
          <path fill="#65715a" d="M17 91l4-21c2-12 11-20 20-21l12 6c8 4 13 18 13 36z" />
          <path fill="#c27b52" d="M38 47l16 6-6 8-12-9z" />
          <g className="mate-loader__sip">
            <path d="M78 57l-5-15-6-3" />
            <path fill="#af714b" d="M65 55h20l-1 6c4 11-1 17-9 17s-13-7-10-15z" />
            <ellipse cx="75" cy="55" rx="10" ry="3" fill="#e8cf9f" />
            <path fill="#dfb28c" d="M48 78l15-10 1-6c0-2 4-2 4 0v3l5-2c4-1 5 4 2 6l-7 5-16 13z" />
            <path fill="#788569" d="M35 66l10 12 10-5 5 9-13 8c-3 1-6-1-8-3l-10-12" />
          </g>
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}
