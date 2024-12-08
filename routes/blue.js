import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Blue is working!');
});

// Mendapatkan semua pelanggan
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

// Mendapatkan semua voucher yang tersedia
router.get('/voucher', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM voucher'
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Membuat voucher baru
router.post('/voucher', async (req, res) => {
    const { kode, jmlhariberlaku, kuotapenggunaan, harga, potongan, mintrpemesanan } = req.query;
    try {
        // Pertama, harus bikin diskon baru sebagai syarat voucher
        await client.query(
            'INSERT INTO diskon (kode, potongan, mintrpemesanan) VALUES ($1, $2, $3)',
            [kode, potongan, mintrpemesanan]
        );
        // Kedua, baru bikin voucher baru
        await client.query(
            'INSERT INTO voucher (kode, jmlhariberlaku, kuotapenggunaan, harga) VALUES ($1, $2, $3, $4)',
            [kode, jmlhariberlaku, kuotapenggunaan, harga]
        );
        // Pesan berhasil
        res.json("Data inserted successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error inserting data');
    }
});

// Tambahkan fungsi lainnya di sini

export default router;