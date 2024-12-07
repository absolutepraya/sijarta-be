import pg from 'pg'
const { Client } = pg

import { config } from 'dotenv';

// Load environment variables
config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => {
        console.log('=> Connected to database!');
        return client.query("SET search_path TO sijarta");
    })
    .then(() => console.log('=> Search path set to "SIJARTA"'))
    .catch(err => console.error('Connection error!', err.stack));

export default client;