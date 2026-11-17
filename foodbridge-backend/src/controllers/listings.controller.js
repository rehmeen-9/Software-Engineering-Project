const pool = require('../config/db');

exports.updateListing = async (req, res) => {
  try {
    const { title, description, quantity, expiry_time, pickup_address } = req.body;

    const result = await pool.query(
      `UPDATE food_listings
       SET title = $1, description = $2, quantity = $3, expiry_time = $4, pickup_address = $5
       WHERE id = $6 AND vendor_id = $7
       RETURNING *`,
      [title, description, quantity, expiry_time, pickup_address, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      // Either the listing doesn't exist or it belongs to another vendor
      return res.status(403).json({ message: 'Listing not found or you do not own it' });
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
