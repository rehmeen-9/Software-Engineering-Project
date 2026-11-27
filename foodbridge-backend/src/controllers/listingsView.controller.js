const pool = require('../config/db');

exports.getMyListings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM food_listings
       WHERE vendor_id = $1
         AND status <> 'removed'  -- ADDED
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ listings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getListing = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name AS vendor_name
       FROM food_listings l
       JOIN users u ON u.id = l.vendor_id
       WHERE l.id = $1
         AND l.status <> 'removed'  -- ADDED`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const listing = result.rows[0];

    // Privacy: only the vendor who owns the listing gets the exact map coordinates.
    // Recipients only ever see a distance (from the nearby endpoint).
    if (listing.vendor_id !== req.user.id) {
      delete listing.latitude;
      delete listing.longitude;
    }

    res.json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADDED: whole function
exports.removeListing = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT vendor_id, status FROM food_listings WHERE id = $1',
      [req.params.id]
    );
    const listing = rows[0];

    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ message: 'Listing not found' });
    }
    if (listing.vendor_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only remove your own listings' });
    }
    if (listing.status === 'reserved') {
      return res.status(409).json({ message: 'Listing has an active reservation' });
    }

    await pool.query(
      "UPDATE food_listings SET status = 'removed', removed_at = NOW() WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: 'Listing removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
