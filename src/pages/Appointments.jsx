import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const SLOT = 30; // minutes
const toMin = (t) => { const [h, m] = t.split(':'); return Number(h) * 60 + Number(m); };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
const hhmm = (t) => t.slice(0, 5);
const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

export default function Appointments() {
  const { profile, user } = useAuth();
  const role = profile?.role;
  const isStudent = role === 'student';
  const canManage = role === 'advisor' || role === 'admin';

  const [appts, setAppts] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [people, setPeople] = useState({});
  const [advisorId, setAdvisorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);

  async function load() {
    const [a, ad, pr] = await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date', { ascending: false }).order('start_time'),
      supabase.from('advisors').select('*'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    setAppts(a.data || []);
    setAdvisors(ad.data || []);
    setPeople(Object.fromEntries((pr.data || []).map((p) => [p.id, p.full_name])));
  }
  useEffect(() => { load(); }, []);

  const advisorName = (id) => people[advisors.find((a) => a.id === id)?.profile_id] || 'Advisor';

  // Load free slots whenever advisor or date changes
  useEffect(() => {
    setSlot(null);
    if (!advisorId || !date) return setSlots([]);
    let stale = false;
    (async () => {
      const day = new Date(date + 'T00:00:00').getDay();
      const [av, bk] = await Promise.all([
        supabase.from('advisor_availability').select('*')
          .eq('advisor_id', advisorId).eq('available_day', day).eq('is_available', true),
        supabase.rpc('get_booked_slots', { p_advisor: advisorId, p_date: date }),
      ]);
      if (stale) return;
      const taken = new Set((bk.data || []).map((b) => toMin(b.start_time)));
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const list = [];
      (av.data || []).forEach((b) => {
        for (let m = toMin(b.start_time); m + SLOT <= toMin(b.end_time); m += SLOT) {
          if (taken.has(m)) continue;
          if (date === todayStr() && m <= nowMin) continue;
          list.push(m);
        }
      });
      setSlots([...new Set(list)].sort((x, y) => x - y));
    })();
    return () => { stale = true; };
  }, [advisorId, date]);

  async function notify(userId, title, message) {
    await supabase.from('notifications').insert({ user_id: userId, title, message, is_read: false });
  }

  async function book() {
    if (slot === null) return setMsg({ type: 'error', text: 'Please pick a time slot.' });
    const { error } = await supabase.from('appointments').insert({
      student_id: user.id, advisor_id: advisorId, appointment_date: date,
      start_time: toTime(slot), end_time: toTime(slot + SLOT),
      status: 'pending', notes: notes || null,
    });
    if (error) {
      return setMsg({
        type: 'error',
        text: error.code === '23505' ? 'Sorry, that slot was just taken. Pick another.' : error.message,
      });
    }
    const adv = advisors.find((a) => a.id === advisorId);
    await notify(adv.profile_id, 'New appointment request',
      `${profile.full_name} requested ${date} at ${hhmm(toTime(slot))}.`);
    setMsg({ type: 'success', text: 'Appointment requested. Waiting for advisor confirmation.' });
    setSlot(null); setNotes(''); setDate(''); setAdvisorId('');
    load();
  }

  async function setStatus(a, status) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', a.id);
    if (error) return setMsg({ type: 'error', text: error.message });
    // notify the other party
    const adv = advisors.find((x) => x.id === a.advisor_id);
    const recipient = user.id === a.student_id ? adv?.profile_id : a.student_id;
    if (recipient)
      await notify(recipient, `Appointment ${status}`,
        `Your appointment on ${a.appointment_date} at ${hhmm(a.start_time)} is now ${status}.`);
    load();
  }

  async function remove(a) {
    if (!window.confirm('Delete this appointment record?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', a.id);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  const active = (a) => a.status === 'pending' || a.status === 'confirmed';

  return (
    <>
      <h1>Appointments</h1>
      <p className="muted">
        {isStudent ? 'Book time with an academic advisor' : canManage ? 'Review and manage appointment requests' : ''}
      </p>
      {msg && <div className={`alert ${msg.type}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {isStudent && (
        <div className="card form-stack">
          <h3>Book an appointment</h3>
          <div className="row">
            <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)}>
              <option value="">Select advisor...</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>{advisorName(a.id)}{a.department ? ` (${a.department})` : ''}</option>
              ))}
            </select>
            <input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {advisorId && date && (
            slots.length === 0
              ? <p className="muted-inline">No free slots on this date. Try another day.</p>
              : <div className="slots">
                  {slots.map((m) => (
                    <button type="button" key={m} className={`slot ${slot === m ? 'selected' : ''}`} onClick={() => setSlot(m)}>
                      {hhmm(toTime(m))}
                    </button>
                  ))}
                </div>
          )}

          <textarea rows="2" placeholder="What would you like to discuss? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div><button className="btn" onClick={book} disabled={slot === null}>Request appointment</button></div>
        </div>
      )}

      {appts.length === 0 ? <div className="card">No appointments yet.</div> : (
        <table>
          <thead>
            <tr><th>Date</th><th>Time</th><th>{isStudent ? 'Advisor' : 'Student'}</th><th>Notes</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {appts.map((a) => (
              <tr key={a.id}>
                <td>{a.appointment_date}</td>
                <td>{hhmm(a.start_time)} - {hhmm(a.end_time)}</td>
                <td>{isStudent ? advisorName(a.advisor_id) : people[a.student_id] || 'Student'}</td>
                <td>{a.notes || '—'}</td>
                <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                <td>
                  <div className="row">
                    {canManage && a.status === 'pending' && <button className="btn btn-sm" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>}
                    {canManage && a.status === 'confirmed' && <button className="btn btn-sm" onClick={() => setStatus(a, 'completed')}>Complete</button>}
                    {active(a) && <button className="btn btn-sm btn-light" onClick={() => setStatus(a, 'cancelled')}>Cancel</button>}
                    {(isStudent || role === 'admin') && !active(a) && <button className="btn btn-sm btn-danger" onClick={() => remove(a)}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}