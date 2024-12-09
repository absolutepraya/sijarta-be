import { Router } from 'express';
import client from '../db.js';
import { v4 as uuidv4 } from 'uuid';

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
router.get('/transaksi/:userid', async (req, res) => {
    const userId = req.params.userid;
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

// ID transaksi
const IdTopUp = 'c260c2a1-52c8-47b3-9103-bdc34815e4aa';
const IdPembayaranJasa = '7f0682ef-356e-40cd-9085-146e39394b45';
const IdTransfer = 'b5fbb667-8279-429f-9e04-b0dca12d0bba';
const IdWithdraw = '3675f15f-9d3b-454d-a049-443017108cb9';

// Melakukan transaksi top-up saldo MyPay
router.put('/topup', async (req, res) => {
    const { userid, nominal } = req.query;
    try {
        await client.query('BEGIN');
        await client.query(
            'INSERT INTO tr_mypay (id, userid, tgl, nominal, kategoriid) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), userid, new Date(), nominal, IdTopUp]
        );
        await client.query(
            'UPDATE "user" SET saldomypay = saldomypay + $1 WHERE id = $2',
            [nominal, userid]
        );
        await client.query('COMMIT');
        res.send('Top-up successful');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Error topping up balance');
    }
})

// TODO: Mendapatkan semua jasa yang harus dibayar oleh user

// TODO: Melakukan pembayaran jasa
router.put('/bayar-jasa', async (req, res) => {
    const { userid, nominal, pesananid } = req.query;
    try {

    } catch (err) {

    }
});

// Melakukan transaksi transfer saldo MyPay
router.put('/transfer', async (req, res) => {
    const { senderid, receivernohp, nominal } = req.query;
    try {
        await client.query('BEGIN');
        await client.query(
            'INSERT INTO tr_mypay (id, userid, tgl, nominal, kategoriid) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), senderid, new Date(), nominal, IdTransfer]
        );
        await client.query(
            'UPDATE "user" SET saldomypay = saldomypay - $1 WHERE id = $2',
            [nominal, senderid]
        );
        await client.query(
            'UPDATE "user" SET saldomypay = saldomypay + $1 WHERE nohp = $2',
            [nominal, receivernohp]
        );
        await client.query('COMMIT');
        res.send('Transfer successful');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Error transferring balance');
    }
});

// Melakukan withdraw saldo MyPay
router.put('/withdraw', async (req, res) => {
    const { userid, nominal } = req.query;
    try {
        await client.query('BEGIN');
        await client.query(
            'INSERT INTO tr_mypay (id, userid, tgl, nominal, kategoriid) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), userid, new Date(), nominal, IdWithdraw]
        );
        await client.query(
            'UPDATE "user" SET saldomypay = saldomypay - $1 WHERE id = $2',
            [nominal, userid]
        );
        await client.query('COMMIT');
        res.send('Withdrawal successful');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Error refunding balance');
    }
});

export default router;