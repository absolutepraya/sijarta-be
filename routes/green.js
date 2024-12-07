import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Green is working!');
});

router.get('/pelanggan', async (req, res) => {
    try {
        const results = await client.query('SELECT * FROM pelanggan');
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Tambahkan fungsi lainnya di sini

export default router;