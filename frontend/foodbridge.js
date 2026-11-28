/* FoodBridge shared helpers. Load AFTER config.js (needs API_URL and authHeaders). */
const FB = {
  esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },

  /* Redirect to login if not signed in, or to the right home if the role is wrong. */
  guard(role) {
    if (!localStorage.getItem('token')) { location.href = 'login.html'; return false; }
    const mine = localStorage.getItem('role');
    if (role && mine !== role) { location.href = mine === 'vendor' ? 'vendor-listings.html' : 'browse.html'; return false; }
    return true;
  },

  /* fetch wrapper: adds the JWT, parses JSON, throws readable errors, handles expired sessions. */
  async api(path, opts = {}) {
    const res = await fetch(API_URL + path, { ...opts, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) } });
    if (res.status === 401) { localStorage.clear(); location.href = 'login.html'; throw new Error('Session expired'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.message || 'Request failed (' + res.status + ')') + (data.errors ? ': ' + data.errors.join('. ') : ''));
    return data;
  },

  /* The ONE place that maps backend field names to what the screens use.
     If your database columns are named differently, edit only this function. */
  listing(r) {
    return {
      id: r.id,
      title: r.title || 'Untitled',
      description: r.description || '',
      quantity: r.quantity ?? '',
      category: r.food_type || '',
      pickupStart: r.pickup_start || '',
      pickupEnd: r.pickup_end || r.expiry_time || '',
      address: r.pickup_address || '',
      vendor: r.vendor_name || '',
      photo: r.photo_url || '',
      distance: r.distance_km,
      status: r.status || 'available',
      raw: r
    };
  },
  list(d) { return (Array.isArray(d) ? d : d.listings || d.data || []).map(FB.listing); },
  one(d) { return FB.listing(d.listing || d.data || d); },
  when(v) { if (!v) return 'Not set'; const t = new Date(v); return isNaN(t) ? v : t.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }); },

  photo(l, h) {
    const src = l.photo || (API_URL + '/api/listings/' + encodeURIComponent(l.id) + '/image');
    return '<div class="ph" style="position:relative;min-height:' + h + 'px">No photo<img alt="" src="' + FB.esc(src) +
      '" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div>';
  },
  window(l) { return FB.when(l.pickupStart) + ' to ' + FB.when(l.pickupEnd); },
  toInput(v) { const t = new Date(v); return isNaN(t) ? '' : new Date(t - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16); },

  show(el, text, kind) { el.textContent = text; el.className = 'msg show ' + kind; },

  /* Renders the top bar into <div id="nav"></div>, with links based on role. */
  nav(active) {
    const vendor = localStorage.getItem('role') === 'vendor';
    const links = vendor ? [['vendor-listings.html', 'My listings'], ['create-listing.html', 'Post food']] : [['browse.html', 'Browse food']];
    document.getElementById('nav').outerHTML =
      '<nav class="nav"><span class="logo"><i></i>FoodBridge</span>' +
      links.map(l => '<a href="' + l[0] + '"' + (l[0] === active ? ' class="on"' : '') + '>' + l[1] + '</a>').join('') +
      '<button class="out" onclick="FB.logout()">Log out</button></nav>';
  },

  async logout() {
    try { await fetch(API_URL + '/api/auth/logout', { method: 'POST', headers: authHeaders() }); } catch (e) {}
    localStorage.clear(); location.href = 'login.html';
  }
};
