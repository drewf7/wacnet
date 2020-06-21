const database = require('../connectors/postgres.connector');

exports.getSites = async function() {
    return database.query(`
    SELECT * FROM "${process.env.PGDATABASE}".site
    `);
}

exports.getSiteByName = async function(siteName) {
    return database.query(`
    SELECT * FROM "${process.env.PGDATABASE}".site WHERE "siteName" = $1
    `, [siteName]);
}

exports.createSite = async function(siteName, siteHourlyURL) {
    return database.query(`
    INSERT INTO "${process.env.PGDATABASE}".site
    ("siteName", "siteHourlyDataURL", "lastUpdated")
    VALUES($1, $2, $3)
    `, [siteName, siteHourlyURL, new Date().toISOString()]);
}

exports.updateLastUpdatedTime = async function(siteId) {
    return database.query(`
    UPDATE "${process.env.PGDATABASE}".site
    SET "lastUpdated" = $1
    WHERE "siteId" = $2
    `, [new Date().toISOString(), siteId])
}