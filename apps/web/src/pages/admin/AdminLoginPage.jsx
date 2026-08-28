import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../admin/AuthContext.jsx';
import tierraMateMark from '../../assets/tierra-mate-mark.png';

export function AdminLoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (session) return <Navigate to="/admin" replace />;

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await login({ email: form.get('email'), password: form.get('password') });
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return <main className="admin-login"><form className="admin-login__card" onSubmit={submit}><div className="brand"><span className="brand__mark" aria-hidden="true"><img src={tierraMateMark} alt="" /></span><span><strong>Tierra Mate</strong><small>ADMINISTRACIÓN</small></span></div><div><p className="eyebrow">Panel privado</p><h1>Bienvenido</h1><p>Ingresá con tu cuenta administrativa.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Contraseña<input name="password" type="password" minLength="8" autoComplete="current-password" required /></label><button className="button button--primary" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button><a href="/">← Volver a la tienda</a></form></main>;
}
