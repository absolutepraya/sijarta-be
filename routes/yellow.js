import { Router } from 'express';
import client from '../db.js';

import { v4 as uuidv4 } from 'uuid';

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

router.post('/register/pengguna', async (req, res) => {
    const { nama, nohp, password, tglLahir, gender, alamat } = req.query;

    // Validasi data
    if (!nama || !nohp || !password || !tglLahir || !gender || !alamat) {
        return res.status(400).send('Semua field harus diisi!');
    }


    try {
        const userId = uuidv4(); // Generate UUID untuk ID user

        // Insert ke tabel user
        await client.query(
            `INSERT INTO "user" (id, nama, jeniskelamin, nohp, pwd, tgllahir, alamat, saldomypay)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
            [userId, nama, gender, nohp, password, tglLahir, alamat]
        );

        // Insert ke tabel pelanggan
        await client.query(
            `INSERT INTO pelanggan (id, level)
            VALUES ($1, 'Base')`,
            [userId]
        );

        res.status(201).send('Registrasi pengguna berhasil!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});




router.post('/register/pekerja', async (req, res) => {
    const { nama, nohp, password, tglLahir, gender, alamat, bank, nomorRekening, npwp, urlFoto } = req.query;

    // Validasi data
    if (!nama || !nohp || !password || !tglLahir || !gender || !alamat || !bank || !nomorRekening || !npwp || !urlFoto) {
        return res.status(400).send('Semua field harus diisi!');
    }

    try {
        // Insert ke tabel user
        const result = await client.query(
            `INSERT INTO "user" (id, nama, jeniskelamin, nohp, pwd, tgllahir, alamat, saldomypay)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 0) RETURNING id`,
            [nama, gender, nohp, password, tglLahir, alamat]
        );

        const userId = result.rows[0].id; // Ambil ID user yang baru saja dibuat

        // Insert ke tabel pekerja
        await client.query(
            `INSERT INTO pekerja (id, namabank, nomorrekening, npwp, linkfoto, rating, jmlpsnananselesai)
            VALUES ($1, $2, $3, $4, $5, 0, 0)`,
            [userId, bank, nomorRekening, npwp, urlFoto]
        );

        res.status(201).send('Registrasi pekerja berhasil!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});



  
router.get('/profile/pekerja', async (req, res) => {
    const { id } = req.query; // Mengambil ID pekerja dari query parameter

    if (!id) {
        return res.status(400).send('ID pekerja diperlukan!');
    }

    try {
        // Ambil data pekerja dengan JOIN antara tabel user dan pekerja
        const result = await client.query(
            `SELECT 
                u.nama, 
                u.jeniskelamin AS gender, 
                u.nohp, 
                u.tgllahir, 
                u.alamat, 
                u.saldomypay, 
                p.namabank,
                p.nomorrekening,
                p.npwp, 
                p.rating, 
                p.jmlpsnananselesai
            FROM 
                "user" u
            JOIN 
                pekerja p 
            ON 
                u.id = p.id
            WHERE 
                u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Pekerja tidak ditemukan!');
        }

        res.status(200).json(result.rows[0]); // Kirim data pekerja
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});


router.get('/profile/pengguna', async (req, res) => {
    const { id } = req.query; // Mengambil ID pengguna dari query parameter

    if (!id) {
        return res.status(400).send('ID pengguna diperlukan!');
    }

    try {
        // Ambil data pengguna dengan JOIN antara tabel "user" dan "pelanggan"
        const result = await client.query(
            `SELECT 
                u.nama, 
                u.jeniskelamin AS gender, 
                u.nohp, 
                u.tgllahir, 
                u.alamat, 
                u.saldomypay, 
                p.level
            FROM 
                "user" u
            JOIN 
                pelanggan p 
            ON 
                u.id = p.id
            WHERE 
                u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Pengguna tidak ditemukan!');
        }

        res.status(200).json(result.rows[0]); // Kirim data pengguna
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});


router.put('/profile/pekerja', async (req, res) => {
    const { id } = req.query;
    const { nama, nohp, password, tglLahir, gender, alamat, bank, npwp, urlFoto } = req.query;

    // Validasi ID
    if (!id) {
        return res.status(400).send('ID pekerja diperlukan!');
    }
 
    try {
        // Update data di tabel user
        await client.query(
            `UPDATE "user" 
            SET nama = COALESCE($1, nama), 
                jeniskelamin = COALESCE($2, jeniskelamin), 
                nohp = COALESCE($3, nohp), 
                pwd = COALESCE($4, pwd), 
                tgllahir = COALESCE($5, tgllahir), 
                alamat = COALESCE($6, alamat)
            WHERE id = $7`,
            [nama, gender, nohp, password, tglLahir, alamat, id]
        );

        // Update data di tabel pekerja
        await client.query(
            `UPDATE pekerja 
            SET namabank = COALESCE($1, namabank), 
                npwp = COALESCE($2, npwp), 
                linkfoto = COALESCE($3, linkfoto)
            WHERE id = $4`,
            [bank, npwp, urlFoto, id]
        );

        res.status(200).send('Profil pekerja berhasil diperbarui!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

router.put('/profile/pengguna', async (req, res) => {
    const { id } = req.query;
    const { nama, nohp, password, tglLahir, gender, alamat } = req.query;

    // Validasi ID
    if (!id) {
        return res.status(400).send('ID pengguna diperlukan!');
    }

    try {
        // Update data di tabel user
        await client.query(
            `UPDATE "user" 
            SET nama = COALESCE($1, nama), 
                jeniskelamin = COALESCE($2, jeniskelamin), 
                nohp = COALESCE($3, nohp), 
                pwd = COALESCE($4, pwd), 
                tgllahir = COALESCE($5, tgllahir), 
                alamat = COALESCE($6, alamat)
            WHERE id = $7`,
            [nama, gender, nohp, password, tglLahir, alamat, id]
        );

        res.status(200).send('Profil pengguna berhasil diperbarui!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});


export default router;