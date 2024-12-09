import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Yellow is working!');
});

router.get('/pelanggan', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM pelanggan' // Query yang akan dijalankan
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/login', async (req, res) => {
    const { nohp, pwd } = req.query;
    try {
        const results = await client.query(
            'SELECT * FROM "user" WHERE nohp = $1 AND pwd = $2',
            [nohp, pwd]
        );
        if (results.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json(results.rows[0]);
    } catch (err) {
        res.status(500).send('Error fetching data');
    }
});

// Tambahkan fungsi lainnya di sini

export default router;