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
        const result = results.rows[0];
        const userId = result.id;
        const roles = await client.query(
            "SELECT id, 'pelanggan' AS role FROM pelanggan WHERE id = $1 UNION SELECT id, 'pekerja' AS role FROM pekerja WHERE id = $1", [userId]
        )
        result.role = roles.rows[0].role;
        res.json(result);
    } catch (err) {
        res.status(500).send('Error fetching data');
    }
});

// Tambahkan fungsi lainnya di sini

export default router;