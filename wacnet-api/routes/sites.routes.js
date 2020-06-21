var express = require('express');
var router = express.Router();

const siteController = require('../controllers/sites.controller');

/**
 * All routes here prefixed by /api/sites
 */

router.get('/',
    siteController.getSiteList
)

router.get('/:siteId',
    siteController.getSiteById
)
module.exports = router;