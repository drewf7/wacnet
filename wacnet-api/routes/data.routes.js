var express = require('express');
var router = express.Router();

const dataController = require('../controllers/data.controller');

/**
 * All routes here prefixed by /api/data
 */

router.get('/:siteId',
    dataController.getDataByTime
)

module.exports = router;