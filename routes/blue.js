import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Blue is working!');
});


router.get('/testimoni', async (req, res) => {
    try {
        const results = await client.query(
            `SELECT trpj.IdPelanggan, trps.IdTrPemesanan, trpj.Sesi, trpj.TotalBiaya, u.Nama, sp.Status, t.Tgl
             FROM TR_PEMESANAN_JASA trpj
             JOIN TR_PEMESANAN_STATUS trps ON trpj.Id = trps.IdTrPemesanan
             JOIN STATUS_PESANAN sp ON trps.IdStatus = sp.Id
             JOIN "user" u ON trpj.IdPekerja = u.Id
             JOIN TESTIMONI t ON trpj.Id = t.IdTrPemesanan;
            ` // Query yang akan dijalankan
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

router.post('/testimoni', async (req, res) => {
    try {
        // Destructure required fields from the request body
        const { idtrpemesanan, tgl, teks, rating } = req.query;

        // Validate input data
        if (!idtrpemesanan || !tgl || !teks) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        if(rating == null)
            rating = 0;

        await client.query(
            'INSERT INTO TESTIMONI (IdTrPemesanan, Tgl, Teks, Rating) VALUES ($1, $2, $3, $4)', 
            [idtrpemesanan, tgl, teks, rating]
        );

        // Respond with the inserted row
        res.status(201).json(results.rows[0]);

    } catch (err) {
        console.error('Error inserting testimonial:', err);
        res.status(500).json({ error: 'An error occurred while creating the testimonial.' });
    }
});

router.post('/voucher', async (req, res) => {
    const { kode, jmlhariberlaku, kuotapenggunaan, harga, potongan, mintrpemesanan } = req.query;
    try {
        // Pertama, harus bikin diskon baru sebagai syarat voucher
        await client.query(
            'INSERT INTO DISKON (kode, potongan, mintrpemesanan) VALUES ($1, $2, $3)',
            [kode, potongan, mintrpemesanan]
        );
        // Kedua, baru bikin voucher baru
        await client.query(
            'INSERT INTO VOUCHER (kode, jmlhariberlaku, kuotapenggunaan, harga) VALUES ($1, $2, $3, $4)',
            [kode, jmlhariberlaku, kuotapenggunaan, harga]
        );
        // Pesan berhasil
        res.json("Data inserted successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error inserting data');
    }
});


// Untuk pembelian voucher dengan mengurangi saldo pengguna yang sedang login.
router.put('/voucher', async(req, res) => {
    const { VoucherId, PaymentMethod } = req.query;
    const UserId = req.user.Id;

    if (!VoucherId || !PaymentMethod) {
        return res.status(400).json({ error: 'Missing VoucherId or PaymentMethod' });
    }

    try {
        const results = await client.query(
            'SELECT * FROM VOUCHER WHERE VOUCHER.Id = $1', [VoucherId]
        );
        if (results.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Voucher not found' });
        }
        const voucher = voucherResult.rows[0];
        if (results.PaymentMethod !== 'MyPay') {
            await client.query('COMMIT');
            return res.json({ message: 'Voucher purchased successfully!', voucher });
        } else {
            // Check saldo
            const userResult = await client.query('SELECT Saldo FROM "user" WHERE "user".Id = $1', [UserId]);
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }
            const userSaldo = parseFloat(userResult.rows[0].Saldo);
            const voucherHarga = parseFloat(voucher.Harga);

            if (userSaldo >= voucherHarga) {
                // Deduct saldo
                const newSaldo = userSaldo - voucherHarga;
                await client.query('UPDATE "user" SET Saldo = $1 WHERE Id = $2', [newSaldo, UserId]);

                await client.query('COMMIT');
                return res.json({ message: 'Voucher purchased successfully!', voucher, newSaldo });
            } else {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient saldo for MyPay payment' });
            }
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error purchasing voucher:', err);
        res.status(500).json({ error: 'Error purchasing voucher' });
    }
});
export default router;

