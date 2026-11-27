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

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const isBlank = (v) => v === undefined || v === null || v === '';

// GET /api/listings/:id/edit   (vendor who owns the listing)
// Returns the raw fields so the edit form can be pre-filled.
exports.getListingForEdit = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid listing id' });

    const result = await pool.query(
      `SELECT id, vendor_id, title, description, food_type, quantity, pickup_start,
              expiry_time AS pickup_end, pickup_address, latitude, longitude, status
       FROM food_listings WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });

    const l = result.rows[0];
    if (l.vendor_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own listings' });
    }
    res.json({
      listing: {
        id: l.id,
        title: l.title,
        description: l.description,
        food_type: l.food_type,
        quantity: l.quantity,
        pickup_start: l.pickup_start,
        pickup_end: l.pickup_end,
        pickup_address: l.pickup_address,
        latitude: l.latitude === null ? null : Number(l.latitude),
        longitude: l.longitude === null ? null : Number(l.longitude),
        status: l.status,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/listings/:id   (vendor who owns the listing)
// Send only the fields you want to change; everything else keeps its current value.
// Accepts pickup_end (or the older name expiry_time) for the end of the pickup window.
exports.updateListing = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid listing id' });

    const existing = await pool.query('SELECT * FROM food_listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });

    const current = existing.rows[0];
    if (current.vendor_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own listings' });
    }
    if (current.status !== 'available') {
      return res.status(409).json({ message: `A ${current.status} listing can't be edited` });
    }
    if (new Date(current.expiry_time) <= new Date()) {
      return res.status(409).json({ message: "An expired listing can't be edited. Post a new one instead" });
    }

    const b = req.body || {};
    const errors = [];

    // Merge what was sent with what is already saved
    const title = b.title !== undefined ? String(b.title).trim() : current.title;
    const description =
      b.description !== undefined ? String(b.description).trim() || null : current.description;
    const food_type = b.food_type !== undefined ? b.food_type : current.food_type;
    const qty = b.quantity !== undefined ? Number(b.quantity) : current.quantity;
    const address =
      b.pickup_address !== undefined ? String(b.pickup_address).trim() : current.pickup_address || '';
    const startRaw = b.pickup_start !== undefined ? b.pickup_start : current.pickup_start;
    const endRaw =
      b.pickup_end !== undefined ? b.pickup_end : b.expiry_time !== undefined ? b.expiry_time : current.expiry_time;

    if (!title) errors.push('Food name is required');
    else if (title.length > 150) errors.push('Food name must be 150 characters or fewer');

    if (!FOOD_TYPES.includes(food_type)) errors.push('Food type must be one of: ' + FOOD_TYPES.join(', '));

    if (!Number.isInteger(qty) || qty < 1) errors.push('Quantity must be a whole number of at least 1');

    const start = startRaw ? new Date(startRaw) : null;
    const end = endRaw ? new Date(endRaw) : null;
    if (start && isNaN(start)) errors.push('Pickup start time is not a valid date');
    if (!end || isNaN(end)) errors.push('Pickup end time is not a valid date');
    else if (start && !isNaN(start) && end <= start) errors.push('Pickup end must be after pickup start');
    else if (end <= new Date()) errors.push('Pickup window must end in the future');

    if (!address) errors.push('Pickup location is required');

    // Map location: send both or neither. Send both as null to clear it.
    let latitude = current.latitude === null ? null : Number(current.latitude);
    let longitude = current.longitude === null ? null : Number(current.longitude);
    if (b.latitude !== undefined || b.longitude !== undefined) {
      if (isBlank(b.latitude) && isBlank(b.longitude)) {
        latitude = null;
        longitude = null;
      } else {
        const la = Number(b.latitude);
        const lo = Number(b.longitude);
        if (
          isBlank(b.latitude) || isBlank(b.longitude) ||
          !Number.isFinite(la) || !Number.isFinite(lo) ||
          la < -90 || la > 90 || lo < -180 || lo > 180
        ) {
          errors.push('Latitude (-90 to 90) and longitude (-180 to 180) must both be valid numbers');
        } else {
          latitude = la;
          longitude = lo;
        }
      }
    }

    if (errors.length) return res.status(400).json({ message: 'Please fix the errors and try again', errors });

    const result = await pool.query(
      `UPDATE food_listings
       SET title = $1, description = $2, food_type = $3, quantity = $4,
           pickup_start = $5, expiry_time = $6, pickup_address = $7,
           latitude = $8, longitude = $9
       WHERE id = $10 AND vendor_id = $11 AND status = 'available'
       RETURNING id, title, description, food_type, quantity, pickup_start,
                 expiry_time AS pickup_end, pickup_address, latitude, longitude, status`,
      [title, description, food_type, qty, start, end, address, latitude, longitude, id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'This listing changed and can no longer be edited' });
    }
    res.json({ message: 'Listing updated', listing: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM food_listings WHERE id = $1 AND vendor_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Listing not found or you do not own it' });
    }
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.removeListing = async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    'SELECT vendor_id, status FROM listings WHERE id = $1', [id]
  );
  const listing = rows[0];

  if (!listing || listing.status === 'removed')
    return res.status(404).json({ error: 'Listing not found' });
  if (listing.vendor_id !== req.user.id)
    return res.status(403).json({ error: 'You can only remove your own listings' });
  if (listing.status === 'reserved')
    return res.status(409).json({ error: 'Listing has an active reservation' });

  await pool.query(
    "UPDATE listings SET status = 'removed', removed_at = NOW() WHERE id = $1", [id]
  );
  res.json({ message: 'Listing removed successfully' });
};
