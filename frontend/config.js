// Change this to your Render URL once the backend is deployed
const API_URL = 'http://localhost:5000';

// The login page should save these after a successful login:
//   localStorage.setItem('token', data.token);
//   localStorage.setItem('role', data.user.role);
function authHeaders() {
  return { Authorization: 'Bearer ' + localStorage.getItem('token') };
}
function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtWindow(start, end) {
  const o = { weekday: 'short', hour: 'numeric', minute: '2-digit' };
  const e = new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (start ? new Date(start).toLocaleString([], o) + ' to ' : 'Until ') + e;
}
