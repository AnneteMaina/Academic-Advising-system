import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const empty = { course_code: '', course_name: '', description: '' };

export default function Courses() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student';

  const [courses, setCourses] = useState([]);
  const [prereqs, setPrereqs] = useState([]);
  const [myUnits, setMyUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pick, setPick] = useState({});
  const [msg, setMsg] = useState(null);

  async function load() {
    const [c, p, u] = await Promise.all([
      supabase.from('courses').select('*').order('course_code'),
      supabase.from('prerequisites').select('*'),
      isStudent
        ? supabase.from('student_units').select('*').eq('student_id', user.id)
        : Promise.resolve({ data: [] }),
    ]);
    setCourses(c.data || []);
    setPrereqs(p.data || []);
    setMyUnits(u.data || []);
  }

  useEffect(() => { if (profile) load(); }, [profile?.role]);

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const prereqsOf = (id) => prereqs.filter((p) => p.course_id === id);
  const flash = (type, text) => setMsg({ type, text });

  const filtered = courses.filter((c) =>
    (c.course_code + ' ' + c.course_name).toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(c) {
    setForm({ course_code: c.course_code, course_name: c.course_name, description: c.description || '' });
    setEditId(c.id); setShowForm(true); window.scrollTo(0, 0);
  }

  function cancelForm() { setForm(empty); setEditId(null); setShowForm(false); }

  async function saveCourse(e) {
    e.preventDefault();
    const payload = { ...form, course_code: form.course_code.trim().toUpperCase() };
    const { error } = editId
      ? await supabase.from('courses').update(payload).eq('id', editId)
      : await supabase.from('courses').insert(payload);
    if (error) return flash('error', error.message);
    flash('success', editId ? 'Course updated.' : 'Course added.');
    cancelForm(); load();
  }

  async function deleteCourse(c) {
    if (!window.confirm(`Delete ${c.course_code}?`)) return;
    const { error } = await supabase.from('courses').delete().eq('id', c.id);
    if (error) return flash('error', 'Cannot delete: ' + error.message);
    flash('success', 'Course deleted.'); load();
  }

  async function addPrereq(courseId) {
    const prereqId = pick[courseId];
    if (!prereqId) return flash('error', 'Choose a prerequisite first.');
    const { error } = await supabase.from('prerequisites')
      .insert({ course_id: courseId, prerequisite_course_id: prereqId });
    if (error) return flash('error', error.message);
    setPick({ ...pick, [courseId]: '' }); load();
  }

  async function removePrereq(id) {
    const { error } = await supabase.from('prerequisites').delete().eq('id', id);
    if (error) return flash('error', error.message);
    load();
  }

  async function addToPlan(course) {
    const done = new Set(myUnits.filter((u) => u.status === 'completed').map((u) => u.course_id));
    const missing = prereqsOf(course.id)
      .filter((p) => !done.has(p.prerequisite_course_id))
      .map((p) => byId[p.prerequisite_course_id]?.course_code);
    if (missing.length)
      return flash('error', `You must complete ${missing.join(', ')} before taking ${course.course_code}.`);
    const { error } = await supabase.from('student_units')
      .insert({ student_id: user.id, course_id: course.id, status: 'planned' });
    if (error) return flash('error', error.message);
    flash('success', `${course.course_code} added to your units.`); load();
  }

  return (
    <>
      <div className="toolbar">
        <div>
          <h1>Courses</h1>
          <p className="muted">{isAdmin ? 'Manage the course catalogue and prerequisites' : 'Browse courses and plan your units'}</p>
        </div>
        {isAdmin && !showForm && <button className="btn" onClick={() => setShowForm(true)}>+ Add course</button>}
      </div>

      {msg && <div className={`alert ${msg.type}`} onClick={() => setMsg(null)}>{msg.text} <small>(click to dismiss)</small></div>}

      {showForm && (
        <form className="card form-stack" onSubmit={saveCourse}>
          <h3>{editId ? 'Edit course' : 'New course'}</h3>
          <input placeholder="Course code (e.g. CS101)" value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} required />
          <input placeholder="Course name" value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} required />
          <textarea rows="3" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row">
            <button className="btn">{editId ? 'Save changes' : 'Add course'}</button>
            <button type="button" className="btn btn-light" onClick={cancelForm}>Cancel</button>
          </div>
        </form>
      )}

      <input className="search" placeholder="Search by code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {filtered.length === 0 && <div className="card">No courses found.</div>}

      {filtered.map((c) => {
        const mine = prereqsOf(c.id);
        const inPlan = myUnits.some((u) => u.course_id === c.id);
        const options = courses.filter((o) => o.id !== c.id && !mine.some((p) => p.prerequisite_course_id === o.id));
        return (
          <div className="card" key={c.id}>
            <div className="course-head">
              <h3><span className="code">{c.course_code}</span> {c.course_name}</h3>
              <div className="row">
                {isStudent && (
                  <button className="btn btn-sm" disabled={inPlan} onClick={() => addToPlan(c)}>
                    {inPlan ? 'In your plan' : 'Add to my units'}
                  </button>
                )}
                {isAdmin && <>
                  <button className="btn btn-sm btn-light" onClick={() => startEdit(c)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteCourse(c)}>Delete</button>
                </>}
              </div>
            </div>
            <p>{c.description || 'No description.'}</p>
            <div className="tags">
              <strong>Prerequisites:</strong>
              {mine.length === 0 && <span className="muted-inline">None</span>}
              {mine.map((p) => (
                <span className="tag" key={p.id}>
                  {byId[p.prerequisite_course_id]?.course_code}
                  {isAdmin && <button title="Remove" onClick={() => removePrereq(p.id)}>×</button>}
                </span>
              ))}
            </div>
            {isAdmin && (
              <div className="row" style={{ marginTop: 12 }}>
                <select value={pick[c.id] || ''} onChange={(e) => setPick({ ...pick, [c.id]: e.target.value })}>
                  <option value="">Select prerequisite...</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.course_code} - {o.course_name}</option>)}
                </select>
                <button className="btn btn-sm" onClick={() => addPrereq(c.id)}>Add</button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}