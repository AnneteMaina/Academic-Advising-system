import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Advisors() {
  const [advisors, setAdvisors] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({ profile_id: '', department: '' });
  const [msg, setMsg] = useState(null);

  async function load() {
    const [a, p] = await Promise.all([
      supabase.from('advisors').select('*'),
      supabase.from('profiles').select('id, full_name, email, role').order('full_name'),
    ]);
    setAdvisors(a.data || []);
    setProfiles(p.data || []);
  }
  useEffect(() => { load(); }, []);

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const candidates = profiles.filter((p) => p.role === 'student');
  const flash = (type, text) => setMsg({ type, text });

  async function add(e) {
    e.preventDefault();
    if (!form.profile_id) return flash('error', 'Select a user first.');
    const { error: e1 } = await supabase.from('profiles').update({ role: 'advisor' }).eq('id', form.profile_id);
    if (e1) return flash('error', e1.message);
    const { error: e2 } = await supabase.from('advisors')
      .insert({ profile_id: form.profile_id, department: form.department || null });
    if (e2) {
      await supabase.from('profiles').update({ role: 'student' }).eq('id', form.profile_id);
      return flash('error', e2.message);
    }
    flash('success', 'Advisor created.');
    setForm({ profile_id: '', department: '' });
    load();
  }

  async function saveDept(a, value) {
    if (value === (a.department || '')) return;
    const { error } = await supabase.from('advisors').update({ department: value || null }).eq('id', a.id);
    if (error) flash('error', error.message); else flash('success', 'Department updated.');
  }

  async function remove(a) {
    if (!window.confirm(`Remove ${byId[a.profile_id]?.full_name} as an advisor?`)) return;
    const { error } = await supabase.from('advisors').delete().eq('id', a.id);
    if (error) return flash('error', 'Cannot remove (they may have appointments): ' + error.message);
    await supabase.from('profiles').update({ role: 'student' }).eq('id', a.profile_id);
    flash('success', 'Advisor removed.');
    load();
  }

  return (
    <>
      <h1>Advisors</h1>
      <p className="muted">Promote students to advisors and manage their departments</p>
      {msg && <div className={`alert ${msg.type}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      <form className="card row" onSubmit={add}>
        <select value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })}>
          <option value="">Select a student to promote...</option>
          {candidates.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
        </select>
        <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <button className="btn">Make advisor</button>
      </form>

      {advisors.length === 0 ? <div className="card">No advisors yet.</div> : (
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Department</th><th></th></tr></thead>
          <tbody>
            {advisors.map((a) => (
              <tr key={a.id}>
                <td><strong>{byId[a.profile_id]?.full_name}</strong></td>
                <td>{byId[a.profile_id]?.email}</td>
                <td><input defaultValue={a.department || ''} placeholder="Department" onBlur={(e) => saveDept(a, e.target.value)} /></td>
                <td><button className="btn btn-sm btn-danger" onClick={() => remove(a)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}