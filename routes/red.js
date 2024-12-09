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
router.get('/bayar-jasa', async (req, res) => {
    const { userid } = req.query;
});

// TODO: Melakukan pembayaran jasa
router.put('/bayar-jasa', async (req, res) => {
    const { userid, nominal, pesananid } = req.query;
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

// Mendapatkan semua pesanan dengan idstatus = 5db7572e-9dba-4467-b69b-c09ac3551f4a (Mencari pekerja terdekat)
// Updated route to get all orders with additional category names
router.get('/pesanan-mencari-pekerja-terdekat', async (req, res) => {
    const { idkategori } = req.query;

    try {
        const results = await client.query(
            `SELECT idtrpemesanan
             FROM tr_pemesanan_status 
             WHERE idstatus = '5db7572e-9dba-4467-b69b-c09ac3551f4a'`
        );

        if (results.rows.length === 0) {
            return res.status(404).send('No available orders to do');
        }

        // Extract the IDs from results
        const ids = results.rows.map(row => row.idtrpemesanan);

        // Prepare placeholders for parameterized query
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');

        // Parameter index for idkategori
        const kategoriParamIndex = ids.length + 1;

        // Build the base query
        let baseQuery = `
            SELECT tr_pemesanan_jasa.*,
                   "user".nama AS namapelanggan,
                   subkategori_jasa.namasubkategori,
                   kategori_jasa.namakategori
            FROM tr_pemesanan_jasa
            JOIN "user" ON tr_pemesanan_jasa.idpelanggan = "user".id
            JOIN subkategori_jasa ON tr_pemesanan_jasa.idkategorijasa = subkategori_jasa.id
            JOIN kategori_jasa ON subkategori_jasa.kategorijasaid = kategori_jasa.id
            WHERE tr_pemesanan_jasa.id IN (${placeholders})
        `;
        const queryParams = [...ids];

        if (idkategori !== undefined) {
            baseQuery += ` AND tr_pemesanan_jasa.idkategorijasa = $${kategoriParamIndex}`;
            queryParams.push(idkategori);
        }

        const pemesananResults = await client.query(baseQuery, queryParams);

        res.json(pemesananResults.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Fungsi untuk mengupdate status pesanan
router.put('/pesanan', async (req, res) => {
    const { idpesanan, idstatus } = req.query;
    try {
        await client.query(
            'UPDATE tr_pemesanan_status SET idstatus = $1 WHERE idtrpemesanan = $2',
            [idstatus, idpesanan]
        );
        res.send('Status updated');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating status');
    }
});

// Pesanan untuk update - excludes specific idstatus and matches idpekerja, also returns idstatus
router.get('/pesanan-untuk-update', async (req, res) => {
    const { idpekerja } = req.query;

    try {
        const results = await client.query(
            `SELECT idtrpemesanan
             FROM tr_pemesanan_status 
             WHERE idstatus NOT IN (
                 '5db7572e-9dba-4467-b69b-c09ac3551f4a',
                 'db1c5a8e-0220-4b96-a9a3-a4a965ca2c5e',
                 '8b6930c6-2d60-490d-a038-0ca3c5c44abe'
             )`
        );

        if (results.rows.length === 0) {
            return res.status(404).send('No available orders to update');
        }

        const ids = results.rows.map(row => row.idtrpemesanan);
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
        let baseQuery = `
            SELECT tr_pemesanan_jasa.*,
                   tr_pemesanan_status.idstatus,
                   "user".nama AS namapelanggan,
                   subkategori_jasa.namasubkategori,
                   kategori_jasa.namakategori
            FROM tr_pemesanan_jasa
            JOIN tr_pemesanan_status ON tr_pemesanan_jasa.id = tr_pemesanan_status.idtrpemesanan
            JOIN "user" ON tr_pemesanan_jasa.idpelanggan = "user".id
            JOIN subkategori_jasa ON tr_pemesanan_jasa.idkategorijasa = subkategori_jasa.id
            JOIN kategori_jasa ON subkategori_jasa.kategorijasaid = kategori_jasa.id
            WHERE tr_pemesanan_jasa.id IN (${placeholders})
        `;
        const queryParams = [...ids];

        if (idpekerja !== undefined) {
            baseQuery += ` AND tr_pemesanan_jasa.idpekerja = $${queryParams.length + 1}`;
            queryParams.push(idpekerja);
        }

        const pemesananResults = await client.query(baseQuery, queryParams);

        res.json(pemesananResults.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

export default router;