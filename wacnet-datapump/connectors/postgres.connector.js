const fs = require('fs');
const { Pool } = require('pg');

const config = {
    database: process.env.PGDATABASE,
    max: 20,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(__dirname + '/db-cert.crt')
    }
}

const pool = new Pool(config);

exports.query = async (text, params) => {
    const results = await pool.query(text, params)
    return results.rows;
}