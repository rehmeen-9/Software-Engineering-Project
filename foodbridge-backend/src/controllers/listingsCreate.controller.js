const pool = require('../config/db');

const FOOD_TYPES = ['Bakery', 'Meals', 'Produce', 'Packaged', 'Other'];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns { lat, lng } or { empty: true } (both blank) or { error }
function parseCoords(latRaw, lngRaw) {
  const blank = (v) => v === undefined || v === null || v === '';
  if (blank(latRaw) && blank(lngRaw)) return { empty: true };
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (
    blank(latRaw) || blank(lngRaw) ||
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    return { error: 'Latitude (-90 to 90) and longitude (-180 to 180) must both be valid numbers' };
  }
  return { lat, lng };
}

// POST /api/listings   (vendor only)
exports.createListing = async (req, res) => {
  try {
    const { title, description, food_type, quantity, pickup_start, pickup_end, pickup_address, photo_url, latitude, longitude } = req.body;
    const errors = [];

    const name = (title || '').trim();
    if (!name) errors.push('Food name is required');
    else if (name.length > 150) errors.push('Food name must be 150 characters or fewer');

    if (!FOOD_TYPES.includes(food_type)) errors.push('Food type must be one of: ' + FOOD_TYPES.join(', '));

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) errors.push('Quantity must be a whole number of at least 1');

    const start = pickup_start ? new Date(pickup_start) : null;
    const end = pickup_end ? new Date(pickup_end) : null;
    if (!start || isNaN(start)) errors.push('Pickup start time is required');
    if (!end || isNaN(end)) errors.push('Pickup end time is required');
    if (start && end && !isNaN(start) && !isNaN(end)) {
      if (end <= start) errors.push('Pickup end must be after pickup start');
      else if (end <= new Date()) errors.push('Pickup window must end in the future');
    }

    const address = (pickup_address || '').trim();
    if (!address) errors.push('Pickup location is required');

    const photo = (photo_url || '').trim();
    if (photo && (photo.length > 500 || !/^https?:\/\/\S+$/i.test(photo))) {
      errors.push('Photo must be a link starting with http:// or https://');
    }

    const coords = parseCoords(latitude, longitude);
    if (coords.error) errors.push(coords.error);

    if (errors.length) return res.status(400).json({ message: 'Please fix the errors and try again', errors });

    const result = await pool.query(
      `INSERT INTO food_listings (vendor_id, title, description, food_type, quantity, pickup_start, expiry_time, pickup_address, photo_url, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, title, quantity, status`,
      [req.user.id, name, (description || '').trim() || null, food_type, qty, start, end, address, photo || null, coords.lat ?? null, coords.lng ?? null]
    );
    res.status(201).json({ message: 'Listing created', listing: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/listings?food_type=Bakery&sort=newest|soonest   (recipient only): what recipients can see
// Only available, in-stock listings whose pickup window has not ended. No address or phone here.
exports.browseListings = async (req, res) => {
  try {
    const { food_type, sort = 'newest' } = req.query;
    if (food_type && !FOOD_TYPES.includes(food_type)) {
      return res.status(400).json({ message: 'food_type must be one of: ' + FOOD_TYPES.join(', ') });
    }
    if (!['newest', 'soonest'].includes(sort)) {
      return res.status(400).json({ message: 'sort must be newest or soonest' });
    }
    const orderBy = sort === 'soonest' ? 'l.expiry_time ASC' : 'l.created_at DESC';
    const result = await pool.query(
      `SELECT l.id, l.title, l.description, l.food_type, l.photo_url, l.quantity, l.pickup_start, l.expiry_time AS pickup_end,
              u.name AS vendor_name
       FROM food_listings l
       JOIN users u ON u.id = l.vendor_id
       WHERE l.status = 'available' AND l.quantity > 0 AND l.expiry_time > NOW()
       ORDER BY ${orderBy}`
    );
    res.json({ listings: result.rows.filter((r) => !food_type || r.food_type === food_type) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/listings/nearby?lat=..&lng=..&radius=5&sort=nearest|soonest|newest&food_type=Bakery   (recipient only)
// lat/lng are optional: without them, the recipient's saved profile location is used.
exports.nearbyListings = async (req, res) => {
  try {
    const { food_type, sort = 'nearest' } = req.query;
    if (food_type && !FOOD_TYPES.includes(food_type)) {
      return res.status(400).json({ message: 'food_type must be one of: ' + FOOD_TYPES.join(', ') });
    }
    if (!['nearest', 'soonest', 'newest'].includes(sort)) {
      return res.status(400).json({ message: 'sort must be nearest, soonest or newest' });
    }

    let radius = null; // optional
    if (req.query.radius !== undefined && req.query.radius !== '') {
      radius = Number(req.query.radius);
      if (!Number.isFinite(radius) || radius <= 0 || radius > 100) {
        return res.status(400).json({ message: 'radius must be a number between 0 and 100 km' });
      }
    }

    // 1) current location from the browser, 2) otherwise the saved profile location
    let point = parseCoords(req.query.lat, req.query.lng);
    if (point.error) return res.status(400).json({ message: point.error });
    let source = 'current';
    if (point.empty) {
      const u = await pool.query('SELECT latitude, longitude FROM users WHERE id = $1', [req.user.id]);
      const row = u.rows[0];
      if (!row || row.latitude === null || row.longitude === null) {
        return res.status(422).json({ code: 'NO_LOCATION', message: 'No current or saved location available' });
      }
      point = { lat: Number(row.latitude), lng: Number(row.longitude) };
      source = 'saved';
    }

    const result = await pool.query(
      `SELECT l.id, l.title, l.description, l.food_type, l.photo_url, l.quantity, l.pickup_start,
              l.expiry_time AS pickup_end, l.created_at, l.latitude, l.longitude,
              u.name AS vendor_name
       FROM food_listings l
       JOIN users u ON u.id = l.vendor_id
       WHERE l.status = 'available' AND l.quantity > 0 AND l.expiry_time > NOW()
         AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL`
    );

    let rows = result.rows
      .filter((r) => !food_type || r.food_type === food_type)
      .map((r) => ({ ...r, distance: calculateDistance(point.lat, point.lng, Number(r.latitude), Number(r.longitude)) }));

    if (radius !== null) rows = rows.filter((r) => r.distance <= radius);

    if (sort === 'nearest') rows.sort((a, b) => a.distance - b.distance);
    else if (sort === 'soonest') rows.sort((a, b) => new Date(a.pickup_end) - new Date(b.pickup_end));
    else rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Privacy: the exact coordinates are never sent, only the distance
    const listings = rows.map(({ latitude, longitude, created_at, distance, ...rest }) => ({
      ...rest,
      distance_km: Math.round(distance * 10) / 10,
    }));

    res.json({ listings, location_source: source });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/listings/my-location   (recipient only): saves the profile location
exports.saveMyLocation = async (req, res) => {
  try {
    const c = parseCoords(req.body.latitude, req.body.longitude);
    if (c.empty || c.error) {
      return res.status(400).json({ message: c.error || 'latitude and longitude are required' });
    }
    await pool.query('UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3', [c.lat, c.lng, req.user.id]);
    res.json({ message: 'Location saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
