var express = require('express');
var router = express.Router();


router.use('/sites', require('./sites.routes'));
router.use('/data', require('./data.routes'));

module.exports = router;