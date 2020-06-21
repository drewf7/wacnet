const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

const commonService = require('./services/common.service');
const csvService = require('./services/csv.service');

/**
 * Downloads the hourly data for a given site based on the preset download URL. Saves to tmp/<csv_name>
 *
 * @param {object} site One site record pulled from DB
 * @param {string} workerName The identifier for this worker bee.
 */
async function downloadSiteData(site, workerName) {
    console.log(`[${workerName}]: Downloading ${site['stationName']}. Id "${site.siteId}", URL "${site.siteHourlyDataURL}"`);
    try {
        // Setup Tmp Directory
        if (!fs.existsSync("tmp")){
            fs.mkdirSync("tmp");
        }

        // Download File
        const fileNameArray = site.siteHourlyDataURL.split("/")
        const fileName = fileNameArray[fileNameArray.length - 1];
        const response = await fetch(site.siteHourlyDataURL);
        const destination = fs.createWriteStream(`./tmp/${fileName}`)
        // convert Pipe to Sync
        await new Promise((resolve, reject) => {
            response.body.pipe(destination);
            response.body.on("error", (err) => {
                reject(err);
            })
            response.body.on("finish", function() {
                resolve();
            })
        })
    }
    catch (err) {
        commonService.logError(err, `[${workerName}]: Error processing site with id ${site.siteId}`);
    }
}

/**
 * Instantiates the csv utility and passes it data for the currently assigned site.
 *
 * @param {object} site A site record from the database
 * @param {string} workerName The identifier for this worker bee.
 */
async function processSiteData(site, workerName) {
    console.log(`[${workerName}]: Processing ${site['stationName']}. Id "${site.siteId}", URL "${site.siteHourlyDataURL}"`);
    try {


        // Calculate fileName
        const fileNameArray = site.siteHourlyDataURL.split("/")
        const fileName = fileNameArray[fileNameArray.length - 1];

        // Pass path and identifier into the csv service
        await csvService.importCSV(`./tmp/${fileName}`, workerName);
    }
    catch (err) {
        commonService.logError(err, `[${workerName}]: Error processing site with id ${site.siteId}`);
    }
}

/**
 * Process worker (siteList, workerName)
 * 
 * siteList is a database query for site data, with the additional "downloading" property added to each record.
 * Worker parses through list looking for first site which isn't downloading. Claims that site, and begins downloading it.
 */
class ProcessWorker {
    constructor(siteList, workerName) {
        this.init(siteList, workerName)
    }

    // Should maybe be main() instead of init(). But ¯\_(ツ)_/¯
    async init(siteList, workerName) {
        for (const site of siteList) {
            if (site.downloading === false) {
                site.downloading = true;
                console.log(`[${workerName}]: Claiming ${site.siteName}`);
                await downloadSiteData(site, workerName);
                await processSiteData(site, workerName);
            } else {
                console.log(`[${workerName}]: Skipping site ${site.siteName}`);
            }
        }
    }
}

module.exports.ProcessWorker = ProcessWorker;
