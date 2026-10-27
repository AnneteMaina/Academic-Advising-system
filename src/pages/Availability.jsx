import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Availability() {
  const { user } = useAuth();
  const [advisor, setAdvisor] = useState(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ available_day: 1, start_time: '09:00', end_time: '12:00' });
  const [msg, setMsg] = useState(null);
  const [ready, setReady] = useState(false);

  async function load() {
    const { data: adv } = await supabase.from('advisors').select('*').eq('profile_id', user.id).maybeSingle();
    setAdvisor(adv);
    if (adv) {
      const { data } = await supabase.from('advisor_availability').select('*')
        .eq('advisor_id', adv.id).order('available_day').order('start_time');
      setRows(data || []);
    }
    setReady(true);
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    const { error } = await supabase.from('advisor_availability').insert({
      advisor_id: advisor.id,
      available_day: Number(form.available_day),
      start_time: form.start_time,
      end_time: form.end_time,
      is_available: true,
    });
    if (error) return setMsg({ type: 'error', text: error.message });
    setMsg({ type: 'success', text: 'Availability added.' });
    load();
  }

  async function toggle(r) {
    const { error } = await supabase.from('advisor_availability')
      .update({ is_available: !r.is_available }).eq('id', r.id);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this time block?')) return;
    const { error } = await supabase.from('advisor_availability').delete().eq('id', id);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  if (!ready) return <div className="center-msg">Loading...</div>;
  if (!advisor) return (
    <>
      <h1>My Availability</h1>
      <div className="card">Your account is not linked to an advisor record yet. Ask an admin to set it up.</div>
    </>
  );

  return (
    <>
      <h1>My Availability</h1>
      <p className="muted">Students can book 30-minute slots inside these time blocks</p>
      {msg && <div className={`alert ${msg.type}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      <form className="card row" onSubmit={add}>
        <select value={form.available_day} onChange={(e) => setForm({ ...form, available_day: e.target.value })}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
        <button className="btn">Add time block</button>
      </form>

      {rows.length === 0 ? <div className="card">No time blocks yet.</div> : (
        <table>
          <thead><tr><th>Day</th><th>From</th><th>To</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{DAYS[r.available_day]}</td>
                <td>{r.start_time.slice(0, 5)}</td>
                <td>{r.end_time.slice(0, 5)}</td>
                <td><span className={`badge ${r.is_available ? 'confirmed' : 'cancelled'}`}>{r.is_available ? 'Open' : 'Paused'}</span></td>
                <td className="row">
                  <button className="btn btn-sm btn-light" onClick={() => toggle(r)}>{r.is_available ? 'Pause' : 'Resume'}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}