const commonService = require("../services/common.service");

/**
 * Pass all error responses through here so that they can be formatted the same.
 */
exports.handleError = async function(req, res, rawError, message) {
    commonService.logError(rawError, message);
    res.status(500).json({"message": message});
}