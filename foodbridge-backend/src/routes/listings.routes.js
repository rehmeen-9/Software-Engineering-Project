const router = require('express').Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { updateListing, getListingForEdit, deleteListing } = require('../controllers/listings.controller');
const { getMyListings, getListing } = require('../controllers/listingsView.controller');
const { createListing, browseListings } = require('../controllers/listingsCreate.controller');
router.post('/', authenticate, authorizeRoles('vendor'), createListing);
router.get('/', authenticate, authorizeRoles('recipient'), browseListings);
router.get('/mine', authenticate, authorizeRoles('vendor'), getMyListings);
router.get('/:id/edit', authenticate, authorizeRoles('vendor'), getListingForEdit);
router.get('/:id', authenticate, getListing);
router.put('/:id', authenticate, authorizeRoles('vendor'), updateListing);
router.delete('/:id', authenticate, authorizeRoles('vendor'), deleteListing);

module.exports = router;
