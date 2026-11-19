const pool = require('../config/db');

const FOOD_TYPES = ['Bakery', 'Meals', 'Produce', 'Packaged', 'Other'];

// POST /api/listings   (vendor only)
exports.createListing = async (req, res) => {
  try {
    const { title, description, food_type, quantity, pickup_start, pickup_end, pickup_address } = req.body;
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

    if (errors.length) return res.status(400).json({ message: 'Please fix the errors and try again', errors });

    const result = await pool.query(
      `INSERT INTO food_listings (vendor_id, title, description, food_type, quantity, pickup_start, expiry_time, pickup_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, quantity, status`,
      [req.user.id, name, (description || '').trim() || null, food_type, qty, start, end, address]
    );
    res.status(201).json({ message: 'Listing created', listing: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/listings?food_type=Bakery   (recipient only): what recipients can see
// Only available, in-stock listings whose pickup window has not ended. No address or phone here.
exports.browseListings = async (req, res) => {
  try {
    const { food_type } = req.query;
    if (food_type && !FOOD_TYPES.includes(food_type)) {
      return res.status(400).json({ message: 'food_type must be one of: ' + FOOD_TYPES.join(', ') });
    }
    const result = await pool.query(
      `SELECT l.id, l.title, l.description, l.food_type, l.quantity, l.pickup_start, l.expiry_time AS pickup_end,
              u.name AS vendor_name
       FROM food_listings l
       JOIN users u ON u.id = l.vendor_id
       WHERE l.status = 'available' AND l.quantity > 0 AND l.expiry_time > NOW()
       ORDER BY l.created_at DESC`
    );
    res.json({ listings: result.rows.filter((r) => !food_type || r.food_type === food_type) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
