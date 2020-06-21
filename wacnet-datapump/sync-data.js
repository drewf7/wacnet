require('dotenv').config();
const del = require('del');

const commonService = require('./services/common.service');
const siteService = require('./services/site.service');

const { ProcessWorker } = require("./import-worker");

/**
 * Pulls a list of all configured sites from the database.
 * Parses through the list and creates three worker bees to handle data processing and import.
 * Worker bees will launch themsleves. So no need to manually init.
 */
async function main() {
	try {
		await del(['tmp']);
	}
	catch (error) {
		console.log("Error deleting tmp");
		console.log(error);
	}
    siteService.getSites()
    .then(async results => {
        const sites = [];
        for (const site of results) {
            site.downloading = false;
            sites.push(site);
        }

        const worker1 = new ProcessWorker(sites, "Worker 1");
        const worker2 = new ProcessWorker(sites, "Worker 2");
        const worker3 = new ProcessWorker(sites, "Worker 3");
    })
    .catch(err => {
        commonService.logError(err, "Error fetching site list.");
    })
}

main();