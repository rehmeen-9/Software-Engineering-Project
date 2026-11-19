const pool = require('../config/db');

exports.getMyListings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM food_listings
       WHERE vendor_id = $1
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
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
