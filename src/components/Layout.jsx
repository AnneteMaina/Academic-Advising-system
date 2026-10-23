import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  student: [['/', 'Dashboard'], ['/courses', 'Courses'], ['/my-units', 'My Units'], ['/appointments', 'Appointments'], ['/notifications', 'Notifications']],
  advisor: [['/', 'Dashboard'], ['/appointments', 'Appointments'], ['/availability', 'My Availability'], ['/courses', 'Courses'], ['/notifications', 'Notifications']],
  admin: [['/', 'Dashboard'], ['/courses', 'Manage Courses'], ['/advisors', 'Advisors'], ['/appointments', 'Appointments'], ['/notifications', 'Notifications']],
};

export default function Layout() {
  const { profile, signOut } = useAuth();
  const links = NAV[profile?.role] || NAV.student;
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2 className="brand">Academic<span>Advising</span></h2>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <strong>{profile?.full_name}</strong>
          <small>{profile?.role}</small>
          <button className="btn btn-light" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  );
}