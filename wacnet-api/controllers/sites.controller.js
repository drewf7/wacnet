const commonController = require('./common.controller');
const siteService = require('../services/site.service');

/**
 * Returns a list of all sites.
 */
exports.getSiteList = async function(req, res, next) {
    siteService.getSites()
    .then(results => {
        res.status(200).json(results);
    })
    .catch(err => {
        commonController.handleError(req, res, err, "Error Fetching Site List.")
    })
}

exports.getSiteById = async function(req, res, next) {
    siteService.getSiteById(req.params.siteId)
    .then(results => {
        res.status(200).json(results);
    })
    .catch(err => {
        commonController.handleError(req, res, err, "Error Fetching site by id.")
    })
}