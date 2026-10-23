import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg({ type: '', text: '' });
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) setMsg({ type: 'error', text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (error) setMsg({ type: 'error', text: error.message });
      else if (!data.session) setMsg({ type: 'success', text: 'Account created. Check your email to confirm, then log in.' });
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Academic<span>Advising</span></h1>
        <p className="muted">{mode === 'login' ? 'Sign in to your account' : 'Create a student account'}</p>
        {mode === 'signup' && (
          <input placeholder="Full name" value={form.full_name} onChange={set('full_name')} required />
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6 characters)" minLength={6} value={form.password} onChange={set('password')} required />
        {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <button type="button" className="link-btn" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg({ type: '', text: '' }); }}>
          {mode === 'login' ? "No account? Sign up" : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}