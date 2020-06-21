const database = require('../connectors/postgres.connector');

exports.getMostRecentDatapointForSite = async function(siteId) {
    return database.query(`
    SELECT * FROM "${process.env.PGDATABASE}".data
    WHERE "siteId" = $1
    ORDER BY timestamp DESC
    LIMIT 1
    `, [siteId])
}

exports.insertDatapoint = async function(siteId, timestamp, data) {
    return database.query(`
    INSERT INTO "${process.env.PGDATABASE}".data
    ("siteId", "timestamp", "data")
    VALUES($1, $2, $3)
    `, [siteId, timestamp, JSON.stringify(data)])
}