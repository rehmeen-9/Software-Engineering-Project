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
// ---------- listing images ----------
const MAX_IMAGE_MB = 3;

// Uploaded images are stored as "/api/listings/5/image"; older listings may have a full link
function photoSrc(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return API_URL + url;
  return '';
}

// Quick check in the browser before uploading (the server checks again). Returns an error message or ''
function checkImageFile(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Unsupported image format. Please choose a JPG, PNG or WebP file.';
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return 'Image is too large. The maximum size is ' + MAX_IMAGE_MB + ' MB.';
  }
  return '';
}

async function uploadListingImage(id, file) {
  const fd = new FormData();
  fd.append('image', file);
  try {
    // no Content-Type header here: the browser adds it for file uploads
    const r = await fetch(API_URL + '/api/listings/' + encodeURIComponent(id) + '/image', { method: 'POST', headers: authHeaders(), body: fd });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, message: d.message || 'Image upload failed' };
  } catch (e) {
    return { ok: false, message: 'Could not reach the server to upload the image.' };
  }
}
