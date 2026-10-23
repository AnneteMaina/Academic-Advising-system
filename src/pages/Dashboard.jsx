import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const count = (q) => q.then(({ count }) => count ?? 0);

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const head = { count: 'exact', head: true };
    Promise.all([
      count(supabase.from('appointments').select('*', head).gte('appointment_date', today).in('status', ['pending', 'confirmed'])),
      count(supabase.from('notifications').select('*', head).eq('user_id', user.id).eq('is_read', false)),
      count(supabase.from('student_units').select('*', head).eq('status', 'completed')),
      count(supabase.from('courses').select('*', head)),
    ]).then(([appts, notes, done, courses]) => setStats({ appts, notes, done, courses }));
  }, [user.id]);

  const cards = [
    { label: 'Upcoming appointments', value: stats.appts, to: '/appointments' },
    { label: 'Unread notifications', value: stats.notes, to: '/notifications' },
    { label: 'Courses available', value: stats.courses, to: '/courses' },
    ...(profile?.role === 'student' ? [{ label: 'Units completed', value: stats.done, to: '/my-units' }] : []),
  ];

  return (
    <>
      <h1>Welcome, {profile?.full_name}</h1>
      <p className="muted">Signed in as {profile?.role}</p>
      <div className="grid">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="stat-card">
            <span className="stat-num">{c.value ?? '–'}</span>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}