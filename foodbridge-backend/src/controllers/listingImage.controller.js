const multer = require('multer');
const pool = require('../config/db');

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }).single('image');

// Looks at the first bytes of the file to find its real type (the file name can be faked)
function detectType(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

// POST /api/listings/:id/image   (vendor who owns the listing), form field name: "image"
exports.uploadListingImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Image is too large. The maximum size is 3 MB.' });
      if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: 'Please send exactly one image.' });
      return res.status(400).json({ message: 'Upload failed. Please try again.' });
    }
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid listing id' });
      if (!req.file) return res.status(400).json({ message: 'Please choose an image to upload.' });

      const type = detectType(req.file.buffer);
      if (!type) return res.status(415).json({ message: 'Unsupported image format. Please upload a JPG, PNG or WebP file.' });

      const owner = await pool.query('SELECT vendor_id FROM food_listings WHERE id = $1', [id]);
      if (owner.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });
      if (owner.rows[0].vendor_id !== req.user.id) return res.status(403).json({ message: 'You can only add images to your own listings' });

      await pool.query(
        `INSERT INTO listing_images (listing_id, content_type, data) VALUES ($1, $2, $3)
         ON CONFLICT (listing_id) DO UPDATE SET content_type = EXCLUDED.content_type, data = EXCLUDED.data, updated_at = NOW()`,
        [id, type, req.file.buffer]
      );
      // the ?v= number makes browsers load the new picture when an image is replaced
      const url = `/api/listings/${id}/image?v=${Date.now()}`;
      await pool.query('UPDATE food_listings SET photo_url = $1 WHERE id = $2', [url, id]);
      res.json({ message: 'Image uploaded', photo_url: url });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error while saving the image' });
    }
  });
};

// GET /api/listings/:id/image   (public: an <img> tag cannot send a login token)
exports.getListingImage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid listing id' });
    const r = await pool.query('SELECT content_type, data FROM listing_images WHERE listing_id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'No image for this listing' });
    res.set('Content-Type', r.rows[0].content_type);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(r.rows[0].data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
};