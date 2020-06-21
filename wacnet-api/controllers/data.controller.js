const dataService = require('../services/data.service');
const commonController = require('../controllers/common.controller');

/**
 * Gets data for one station by time
 * @param req.params.siteId
 * @param req.query.startTime ISO Format
 * @param req.query.endTime ISO format
 */
exports.getDataByTime = async function(req, res, next) {
    const startTime = req.query.startTime;
    const endTime = req.query.endTime;
    const siteId = req.params.siteId;

    if (startTime === undefined || endTime === undefined || siteId === undefined) {
        res.status(500).json({"message": "Invalid parameters"})
    }

    dataService.getDataByTime(startTime, endTime, siteId)
    .then(results => {
        res.json(results);
    })
    .catch(err => {
        commonController.handleError(req, res, err, "Error fetching data.")
    })
}