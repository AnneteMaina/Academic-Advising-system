import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const hhmm = (t) => t.slice(0, 5);
const count = (q) => q.then(({ count }) => count ?? 0);

export default function Dashboard() {
  const { profile, user } = useAuth();
  const role = profile?.role;
  const [stats, setStats] = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [notes, setNotes] = useState([]);
  const [names, setNames] = useState({});
  const [advisors, setAdvisors] = useState([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const today = new Date().toLocaleDateString('en-CA');
      const head = { count: 'exact', head: true };
      const [appts, unread, done, courses, list, recent, pr, ad] = await Promise.all([
        count(supabase.from('appointments').select('*', head).gte('appointment_date', today).in('status', ['pending', 'confirmed'])),
        count(supabase.from('notifications').select('*', head).eq('user_id', user.id).eq('is_read', false)),
        count(supabase.from('student_units').select('*', head).eq('student_id', user.id).eq('status', 'completed')),
        count(supabase.from('courses').select('*', head)),
        supabase.from('appointments').select('*').gte('appointment_date', today)
          .in('status', ['pending', 'confirmed']).order('appointment_date').order('start_time').limit(5),
        supabase.from('notifications').select('*').eq('user_id', user.id)
          .eq('is_read', false).order('created_at', { ascending: false }).limit(3),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('advisors').select('id, profile_id'),
      ]);
      setStats({ appts, unread, done, courses });
      setUpcoming(list.data || []);
      setNotes(recent.data || []);
      setNames(Object.fromEntries((pr.data || []).map((p) => [p.id, p.full_name])));
      setAdvisors(ad.data || []);
    })();
  }, [profile?.role]);

  const advisorName = (id) => names[advisors.find((a) => a.id === id)?.profile_id] || 'Advisor';
  const otherParty = (a) => (role === 'student' ? advisorName(a.advisor_id) : names[a.student_id] || 'Student');
  const pct = stats.courses ? Math.round((stats.done / stats.courses) * 100) : 0;

  const quick = {
    student: [['/appointments', 'Book an appointment'], ['/courses', 'Browse courses'], ['/my-units', 'Track my units']],
    advisor: [['/availability', 'Set availability'], ['/appointments', 'Review requests']],
    admin: [['/courses', 'Manage courses'], ['/advisors', 'Manage advisors'], ['/appointments', 'All appointments']],
  }[role] || [];

  return (
    <>
      <h1>Welcome, {profile?.full_name}</h1>
      <p className="muted" style={{ textTransform: 'capitalize' }}>Signed in as {role}</p>

      <div className="row quick-actions">
        {quick.map(([to, label]) => <Link key={to} to={to} className="btn">{label}</Link>)}
      </div>

      <div className="grid">
        <Link to="/appointments" className="stat-card"><span className="stat-num">{stats.appts ?? '–'}</span>Upcoming appointments</Link>
        <Link to="/notifications" className="stat-card"><span className="stat-num">{stats.unread ?? '–'}</span>Unread notifications</Link>
        <Link to="/courses" className="stat-card"><span className="stat-num">{stats.courses ?? '–'}</span>Courses available</Link>
        {role === 'student' && (
          <Link to="/my-units" className="stat-card"><span className="stat-num">{stats.done ?? '–'}</span>Units completed</Link>
        )}
      </div>

      {role === 'student' && (
        <div className="card" style={{ marginTop: 20 }}>
          <strong>Degree progress: {pct}%</strong>
          <div className="progress"><div className="progress-bar" style={{ width: pct + '%' }} /></div>
          <small className="muted-inline">{stats.done} of {stats.courses} catalogue courses completed</small>
        </div>
      )}

      <div className="dash-cols">
        <div className="card">
          <h3>Upcoming appointments</h3>
          {upcoming.length === 0 ? <p className="muted-inline">Nothing scheduled.</p> : upcoming.map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <strong>{a.appointment_date}</strong> at {hhmm(a.start_time)}
                <br /><small className="muted-inline">with {otherParty(a)}</small>
              </div>
              <span className={`badge ${a.status}`}>{a.status}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Recent notifications</h3>
          {notes.length === 0 ? <p className="muted-inline">You're all caught up.</p> : notes.map((n) => (
            <div className="list-item" key={n.id}>
              <div><strong>{n.title}</strong><br /><small className="muted-inline">{n.message}</small></div>
            </div>
          ))}
          <Link to="/notifications" className="link-btn">View all →</Link>
        </div>
      </div>
    </>
  );
}