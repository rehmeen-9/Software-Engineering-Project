const router = require('express').Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { updateListing, deleteListing } = require('../controllers/listings.controller');

router.put('/:id', authenticate, authorizeRoles('vendor'), updateListing);
router.delete('/:id', authenticate, authorizeRoles('vendor'), deleteListing);

module.exports = router;
