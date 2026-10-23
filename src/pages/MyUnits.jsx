import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function MyUnits() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [courses, setCourses] = useState({});
  const [msg, setMsg] = useState(null);

  async function load() {
    const [u, c] = await Promise.all([
      supabase.from('student_units').select('*').eq('student_id', user.id).order('created_at'),
      supabase.from('courses').select('*'),
    ]);
    setUnits(u.data || []);
    setCourses(Object.fromEntries((c.data || []).map((x) => [x.id, x])));
  }
  useEffect(() => { load(); }, []);

  async function update(id, changes) {
    const { error } = await supabase.from('student_units').update(changes).eq('id', id);
    if (error) setMsg({ type: 'error', text: error.message });
    else load();
  }

  async function remove(id) {
    if (!window.confirm('Remove this unit from your plan?')) return;
    const { error } = await supabase.from('student_units').delete().eq('id', id);
    if (error) setMsg({ type: 'error', text: error.message });
    else load();
  }

  const n = (s) => units.filter((u) => u.status === s).length;

  return (
    <>
      <h1>My Units</h1>
      <p className="muted">Track your progress through your degree</p>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><span className="stat-num">{n('completed')}</span>Completed</div>
        <div className="stat-card"><span className="stat-num">{n('in_progress')}</span>In progress</div>
        <div className="stat-card"><span className="stat-num">{n('planned')}</span>Planned</div>
      </div>

      {units.length === 0 ? (
        <div className="card">No units yet. Go to <strong>Courses</strong> and add some.</div>
      ) : (
        <table>
          <thead><tr><th>Course</th><th>Semester</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td><strong>{courses[u.course_id]?.course_code}</strong><br />{courses[u.course_id]?.course_name}</td>
                <td>
                  <input defaultValue={u.semester || ''} placeholder="e.g. 2026 Sem 1"
                    onBlur={(e) => e.target.value !== (u.semester || '') && update(u.id, { semester: e.target.value })} />
                </td>
                <td>
                  <select value={u.status} onChange={(e) => update(u.id, { status: e.target.value })}>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td><button className="btn btn-sm btn-danger" onClick={() => remove(u.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}