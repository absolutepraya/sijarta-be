import { Router } from 'express';
import client from '../db.js';

const router = Router();

//                  List of relations
// Schema | Name | Type | Owner
// --------- +----------------------- +------- +----------
// sijarta | diskon | table | postgres
// sijarta | kategori_jasa | table | postgres
// sijarta | kategori_tr_mypay | table | postgres
// sijarta | metode_bayar | table | postgres
// sijarta | pekerja | table | postgres
// sijarta | pekerja_kategori_jasa | table | postgres
// sijarta | pelanggan | table | postgres
// sijarta | promo | table | postgres
// sijarta | sesi_layanan | table | postgres
// sijarta | status_pesanan | table | postgres
// sijarta | subkategori_jasa | table | postgres
// sijarta | testimoni | table | postgres
// sijarta | tr_mypay | table | postgres
// sijarta | tr_pembelian_voucher | table | postgres
// sijarta | tr_pemesanan_jasa | table | postgres
// sijarta | tr_pemesanan_status | table | postgres
// sijarta | user | table | postgres
// sijarta | voucher | table | postgres
// (18 rows)

router.get('/', async (req, res) => {
    res.send('Red is working!');
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

// Mendapatkan saldo user berdasarkan ID
router.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const results = await client.query(
            'SELECT nama, nohp, saldomypay FROM "user" WHERE id = $1',
            [userId]
        );
        if (results.rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json(results.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Mendapatkan riwayat transaksi user berdasarkan ID
router.get('/transaksi/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const results = await client.query(
            `SELECT tr_mypay.nominal, tr_mypay.tgl, kategori_tr_mypay.nama AS kategori
             FROM tr_mypay
             JOIN kategori_tr_mypay ON tr_mypay.kategoriid = kategori_tr_mypay.id
             WHERE tr_mypay.userid = $1`,
            [userId]
        );
        if (results.rows.length === 0) {
            return res.status(404).send('No transactions found');
        }

        // Convert ISO date to readable format
        const formattedResults = results.rows.map(row => ({
            ...row,
            tgl: new Date(row.tgl).toLocaleString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
        }));

        res.json(formattedResults);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Memfilter user berdasarkan jenis kelamin dan minimum saldo
router.get('/filter', async (req, res) => {
    const { sex, minsaldo } = req.query;
    try {
        const results = await client.query(
            `SELECT nama, nohp, jeniskelamin, saldomypay FROM "user"
             WHERE jeniskelamin = $1 AND saldomypay >= $2`,
            [sex, minsaldo]
        );
        if (results.rows.length === 0) {
            return res.status(404).send('No users found');
        }
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});


export default router;