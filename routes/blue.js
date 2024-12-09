import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Blue is working!');
});


// Mendapatkan semua pelanggan
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

// Memasukkan pemesanan yang sudah selesai ke dalam list testimoni
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
            'INSERT INTO TESTIMONI (IdTrPemesanan, Tgl, Teks, Rating) VALUES ($1, $2, $3, $4);', 
            [String(idtrpemesanan), String(tgl), String(teks), rating]
        );

        res.status(201).json("Successfully inserted data.");

    } catch (err) {
        console.error('Error inserting testimonial:', err);
        res.status(500).json({ error: 'An error occurred while creating the testimonial.' });
    }
});

router.delete('/testimoni', async (req, res) => {
    try {
        const { idtrpemesanan, tgl, teks, rating } = req.query;
        // Validate input data
        if (!idtrpemesanan || !tgl || !teks) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }


        if(rating == null)
            rating = 0;

        await client.query(
            `DELETE FROM TESTIMONI 
            WHERE IdTrPemesanan = $1 AND Tgl = $2 AND Teks = $3 AND Rating = $4;`, 
            [String(idtrpemesanan), String(tgl), String(teks), rating]
        );

        res.status(201).json("Successfully deleted data.");

    } catch (err) {
        console.error('Error inserting testimonial:', err);
        res.status(500).json({ error: 'An error occurred while creating the testimonial.' });
    }
});

// Mendapatkan semua voucher yang tersedia
router.get('/voucher', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM VOUCHER'
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Mendapatkan semua promo yang tersedia
router.get('/promo', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM PROMO'
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Untuk pembelian voucher dengan mengurangi saldo pengguna yang sedang login.
router.put('/voucher', async (req, res) => {

    // UserId in query just for testing
    const { userid, voucherid } = req.query;
    // const UserId = req.user.Id;

    if (!voucherid || !userid) {
        return res.status(400).json({ error: 'Missing VoucherId or PaymentMethod' });
    }

    try {
        const results = await client.query(
            `SELECT mb.nama, trpv.IdPelanggan, trpv.IdVoucher, trpv.TelahDigunakan, trpv.IdMetodeBayar, v.Harga 
             FROM TR_PEMBELIAN_VOUCHER trpv
             LEFT JOIN VOUCHER v ON trpv.IdVoucher = v.Kode
             LEFT JOIN METODE_BAYAR mb ON trpv.IdMetodeBayar = mb.Id
             WHERE trpv.IdPelanggan = $1 AND trpv.IdVoucher = $2;`, [userid, voucherid]
        );
        if (results.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Voucher not found' });
        }
        const voucher = results.rows[0];

        console.log("user id: " + userid + " voucher id: " + voucherid + "\n");

        if (voucher.nama !== 'MyPay') {
            await client.query('COMMIT');
            const temp = await client.query(`SELECT trpv.TelahDigunakan, v.KuotaPenggunaan
                                             FROM TR_PEMBELIAN_VOUCHER trpv
                                             JOIN VOUCHER v ON trpv.idVoucher = v.Kode
                                             WHERE trpv.IdPelanggan = $1 AND trpv.IdVoucher = $2;
                                             `, [userid, voucherid]);
            const one = 1;
            const addBy1 = temp.rows[0].telahdigunakan + one;
            const minusBy1 = temp.rows[0].kuotapenggunaan - one;

            
            if(minusBy1 < 0)
                return res.status(400).json({ error: 'Quota for this voucher is 0' });

            await client.query(`UPDATE TR_PEMBELIAN_VOUCHER 
                                SET TelahDigunakan = $1 
                                WHERE IdPelanggan = $2 AND IdVoucher = $3;
                                `, [addBy1, userid, voucherid]);

            await client.query(`UPDATE VOUCHER 
                                SET KuotaPenggunaan = $1 
                                WHERE Kode = $2;
                                `, [minusBy1, voucherid]);

            return res.json({ message: 'Voucher purchased successfully!', voucher });
        } else {
            const userResult = await client.query('SELECT SaldoMyPay FROM "user" WHERE "user".Id = $1', [userid]);
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found' });
            }

            // console.log(userResult);
            const userSaldo = parseFloat(userResult.rows[0].saldomypay);
            const voucherHarga = parseFloat(voucher.harga);

            console.log(userSaldo);
            console.log(voucherHarga);
            if (userSaldo >= voucherHarga) {
                const temp = await client.query(`SELECT trpv.TelahDigunakan, v.KuotaPenggunaan
                                                 FROM TR_PEMBELIAN_VOUCHER trpv
                                                 JOIN VOUCHER v ON trpv.idVoucher = v.Kode
                                                 WHERE trpv.IdPelanggan = $1 AND trpv.IdVoucher = $2;
                                                 `, [userid, voucherid]);
                const one = 1;
                const addBy1 = temp.rows[0].telahdigunakan + one;
                const minusBy1 = temp.rows[0].kuotapenggunaan - one;
            
                if(minusBy1 < 0)
                    return res.status(400).json({ error: 'Quota for this voucher is 0' });

                await client.query(`UPDATE TR_PEMBELIAN_VOUCHER  
                                    SET TelahDigunakan = $1 
                                    WHERE IdPelanggan = $2 AND IdVoucher = $3;
                                    `, [addBy1, userid, voucherid]);

                // Deduct saldo
                const newSaldo = userSaldo - voucherHarga;
                await client.query('UPDATE "user" SET SaldoMyPay = $1 WHERE Id = $2', [newSaldo, userid]);

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
