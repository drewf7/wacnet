const csv = require('csv-parser');
const fs = require('fs');

const commonService = require('../services/common.service');
const dataService = require('../services/data.service');
const siteService = require('../services/site.service');

/**
 * @param {string} filePath Path to the CSV file to import
 * @param {string} workerName Identifier for this worker bee.
 */
exports.importCSV = async function(filePath, workerName) {
    try {
        // Turn CSV import pipe into promise so it can be "await"'d
        const readPromise = new Promise(function(resolve, reject) {
            const rowData = [];
            fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => rowData.push(data))
            .on('end', () => {
                resolve(rowData);
            });
        });

        const rows = await readPromise;
        // There can be an extra row at the start. This accounts for it.
        // We want the first three rows to always be identifiers, units, and measurementTypes. Since this seems to be the
        // agreed upon standard.
        const rowOneValues = [];
        for (const row in rows[0]) {
            rowOneValues.push(rows[0][row])
        }
        if (!rowOneValues.includes("TIMESTAMP")) {
            rows.splice(0,1);
        }

        // Get copies of our three header rows.
        const identifiers = rows[0];
        const units = rows[1];
        const measurementTypes = rows[2];

        // Cut them from the main dataset.
        rows.splice(0,3);
        
        // Some sites have "site" as a data column, which lets us tag them. Others do not.
        // If an import does not have a "site" column. We use 
        let siteName = await this.getDataByIdentifier(identifiers, rows[3], "site");
        if (siteName === null) {
            let pathArray = filePath.split('.csv')[0].split('/')
            siteName = pathArray[pathArray.length - 1];
        }

        // Get Site Data
        try {
            const results = await siteService.getSiteByName(siteName);
            if (results.length === 0) {
                logError({"error": "Misconfigured site"}, `[${workerName}]: No site data for ${siteName}`)
            } else {
                // Run data insertion for this site.
                await this.insertData(results[0]["siteId"], rows, identifiers, units, measurementTypes, workerName);
            }
        }
        catch (error) {
            commonService.logError(error, `[${workerName}]: ` + "Error Fetching Site.")
        }
    }
    catch(error) {
        commonService.logError(error, `[${workerName}]: ` + "Error parsing site.")
    }
}

/**
 * @param {string} siteId The identifier for the site we are inserting rows too
 * @param {array} rows Array<Object> where each entry represents a row of the CSV
 * @param {object} identifier The first header row of the CSV containing identifier information
 * @param {object} units The second header row of the CSV containing unit information
 * @param {object} measurementTypes The third header row of the CSV containing measurementTypep information
 * @param {string} workerName The identifier of the worker bee calling this function (for logging) 
 */
exports.insertData = async function(siteId, rows, identifiers, units, measurementTypes, workerName) {

    // Hardcoded list of columns we do not want to import. This is because they either can be derived, or we
    // Add them separatly in the case of something like TIMESTAMP
    const dropColumns = ["TIMESTAMP", "RECORD", "site", "year", "month", "day", "hour"]

    // Wrap each insert incase it fails.
    try {
        // Get the most recent point we inserted so that we can start from new data
        const results = await dataService.getMostRecentDatapointForSite(siteId);
        if (results.length === 0) {
            // Fresh Import
            for (const row of rows) {
                try {
                    // Parsing the data into JSON with the following structure
                    /**
                     * {
                     *     "<identifier>": {
                     *         "value": <value>,
                     *         "unit": <unit>,
                     *         "measurementType": <measurementType>
                     *     },
                     *     "<identifier2>": {} etc...
                     * }
                     */
                    const dataObject = {}
                    for (const value in row) {
                        if (row[value] !== "" && !dropColumns.includes(identifiers[value])) { // If it's not an empty value, and not a column we want to drop, insert it.
                            dataObject[identifiers[value].toLowerCase()] = {
                                "value": row[value],
                                "unit": units[value],
                                "measurementType": measurementTypes[value]
                            }
                        }
                    }

                    // Convert time to iso format with WYO timezone.
                    // It doesn't look like the weather stations account for daylight savings time.
                    // So we always assume a TZ of GMT -6.
                    let timeString = await this.getDataByIdentifier(identifiers, row, "TIMESTAMP")
                    timeString += " GMT -06:00"

                    const time = new Date(Date.parse(timeString))

                    await dataService.insertDatapoint(siteId, time.toISOString(), dataObject)
                    .then (results => {
                        console.log(`[${workerName}]: Inserted row. SiteId "${siteId}" for time ${time.toISOString()}`)
                    })
                    .catch(err => {
                        commonService.logError(err, `[${workerName}]: ` + "Error inserting row")
                        console.log(`Original problem timestamp was ${timeString}`);
                    })
                }
                catch (error) {
                    commonService.logError(error, `[${workerName}]: Error inserting row for site with id ${siteId}`)
                    console.log(row)
                }
            }
        } else {
            const mostRecentDatapointTime = new Date(results[0]['timestamp'])
            for (const row of rows) {
                try {
                    // Convert time to iso format with WYO timezone.
                    // It doesn't look like the weather stations account for daylight savings time.
                    // So we always assume a TZ of GMT -6.
                    let timeString = await this.getDataByIdentifier(identifiers, row, "TIMESTAMP")
                    timeString += " GMT -06:00"

                    const time = new Date(Date.parse(timeString))

                    if (time.getTime() > mostRecentDatapointTime.getTime()) {
                        // Only insert new data

                        const dataObject = {}
                        for (const value in row) {
                            if (row[value] !== "" && !dropColumns.includes(identifiers[value])) { // If it's not an empty value, and not a column we want to drop, insert it.
                                dataObject[identifiers[value].toLowerCase()] = {
                                    "value": row[value],
                                    "unit": units[value],
                                    "measurementType": measurementTypes[value]
                                }
                            }
                        }

                        await dataService.insertDatapoint(siteId, time.toISOString(), dataObject)
                        .then (results => {
                            console.log(`[${workerName}]: Inserted row. SiteId "${siteId}" for time ${time.toISOString()}`)
                        })
                        .catch(err => {
                            commonService.logError(err, `[${workerName}]: ` + "Error inserting row")
                        })
                    } else {
                        //console.log(`[${workerName}]: Skipping existing row with timestamp ${time.toISOString()}`)
                    }
                }
                catch (error) {
                    commonService.logError(error, `[${workerName}]: Error inserting row for site with id ${siteId}`)
                    console.log(row)
                }
            }
        }
        siteService.updateLastUpdatedTime(siteId)
        .catch(err => {
            commonService.logError(err, `[${workerName}]: ` + "Error updating timestamp.")
        })
    }
    catch(error) {
        commonService.logError(error, `[${workerName}]: ` + "Error inserting data.")
    }
}

/**
 * Util to get a specific piece of data based on it's identifier.
 */
exports.getDataByIdentifier = async function (identifiers, dataRow, identifier) {
    for (const data in dataRow) {
        if (identifiers[data] === identifier) {
            return dataRow[data];
        }
    }

    return null;
}