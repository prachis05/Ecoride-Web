const mysql = require('mysql2');
require('dotenv').config();
const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Existing connection for callback-style queries
const db = mysql.createConnection(config);

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL Database');
  }
});

// Separate promise-based connection for async/await queries
const promiseDb = mysql.createConnection(config).promise();

promiseDb.connect()
  .then(() => console.log('Promise database connection established'))
  .catch((err) => console.error('Promise database connection failed:', err));

module.exports = db;
module.exports.promiseDb = promiseDb;