import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const { data, error } = await supabase.from('notifications').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) setMsg({ type: 'error', text: error.message });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function markRead(id) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  async function markAll() {
    const { error } = await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  async function remove(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) setMsg({ type: 'error', text: error.message }); else load();
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="toolbar">
        <div>
          <h1>Notifications</h1>
          <p className="muted">{unread} unread</p>
        </div>
        {unread > 0 && <button className="btn btn-light" onClick={markAll}>Mark all as read</button>}
      </div>
      {msg && <div className={`alert ${msg.type}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {items.length === 0 ? <div className="card">You have no notifications.</div> : items.map((n) => (
        <div key={n.id} className={`card notif ${n.is_read ? '' : 'unread'}`}>
          <div>
            <strong>{n.title}</strong>
            <p>{n.message}</p>
            <small className="muted-inline">{new Date(n.created_at).toLocaleString()}</small>
          </div>
          <div className="row">
            {!n.is_read && <button className="btn btn-sm" onClick={() => markRead(n.id)}>Mark read</button>}
            <button className="btn btn-sm btn-danger" onClick={() => remove(n.id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}