const router = require('express').Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { updateListing, getListingForEdit, deleteListing } = require('../controllers/listings.controller');
const { getMyListings, getListing } = require('../controllers/listingsView.controller');
const { createListing, browseListings, nearbyListings, saveMyLocation } = require('../controllers/listingsCreate.controller');
const { uploadListingImage, getListingImage } = require('../controllers/listingImage.controller');

router.post('/', authenticate, authorizeRoles('vendor'), createListing);
router.get('/', authenticate, authorizeRoles('recipient'), browseListings);
router.get('/mine', authenticate, authorizeRoles('vendor'), getMyListings);

// Nearby feature: these must stay ABOVE the /:id routes
router.get('/nearby', authenticate, authorizeRoles('recipient'), nearbyListings);
router.put('/my-location', authenticate, authorizeRoles('recipient'), saveMyLocation);

// Image feature
router.get('/:id/image', getListingImage); // public on purpose, so <img> tags work
router.post('/:id/image', authenticate, authorizeRoles('vendor'), uploadListingImage);

router.get('/:id/edit', authenticate, authorizeRoles('vendor'), getListingForEdit);
router.get('/:id', authenticate, getListing);
router.put('/:id', authenticate, authorizeRoles('vendor'), updateListing);
router.delete('/:id', authenticate, authorizeRoles('vendor'), deleteListing);
router.delete('/:id', authenticate, authorizeRole('vendor'), listingController.removeListing);

module.exports = router;
