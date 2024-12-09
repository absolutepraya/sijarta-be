import { Router } from 'express';
import client from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    res.send('Green is working!');
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

// nampilin kategori dan subkategori nya (buat homepage)
router.get('/daftar-kategori', async (req, res) => {
    try {
        const results = await client.query(
            `SELECT 
                sijarta.kategori_jasa.id AS idKategoriJasa,
                sijarta.kategori_jasa.namakategori AS namaKategori,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'idSubkategoriJasa', sijarta.subkategori_jasa.id, 
                        'namaSubkategoriJasa', sijarta.subkategori_jasa.namasubkategori
                    )
                ) AS listSubkategori
            FROM 
                sijarta.kategori_jasa
            LEFT JOIN 
                sijarta.subkategori_jasa 
            ON 
                sijarta.kategori_jasa.id = sijarta.subkategori_jasa.kategorijasaid
            GROUP BY 
                sijarta.kategori_jasa.id, sijarta.kategori_jasa.namakategori;`
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// nampilin detail subkategori (untuk halaman subkategori jasa & sesi layanan)
router.get('/subkategori-detail/:subkategoriid', async (req, res) => {
    const subkategoriId = req.params.subkategoriid
    try {
        const results = await client.query(
            `WITH SubkategoriBase AS (
                SELECT 
                    sk.Id as sk_id,
                    sk.NamaSubkategori,
                    sk.deskripsi,
                    kj.Id as kj_id,
                    kj.NamaKategori
                FROM 
                    SUBKATEGORI_JASA sk
                    LEFT JOIN KATEGORI_JASA kj ON sk.KategoriJasaId = kj.Id
                WHERE sk.Id = $1
            )
            SELECT 
                sb.NamaSubkategori,
                sb.NamaKategori,
                sb.deskripsi,
                (
                    SELECT json_agg(json_build_object(
                        'pekerja_id', id,
                        'nama_pekerja', nama
                    ))
                    FROM (
                        SELECT p2.Id as id, p2.Nama as nama
                        FROM "user" p2
                        JOIN PEKERJA pk2 ON pk2.Id = p2.Id
                        JOIN PEKERJA_KATEGORI_JASA pkj2 ON pkj2.PekerjaId = pk2.Id
                        WHERE pkj2.KategoriJasaId = sb.kj_id
                    ) as distinct_pekerja
                ) as pekerja_info,
                (
                    SELECT json_agg(json_build_object(
                        'sesi', sesi,
                        'harga', harga
                    ))
                    FROM (
                        SELECT DISTINCT sl2.Sesi as sesi, sl2.Harga as harga
                        FROM SESI_LAYANAN sl2
                        WHERE sl2.SubkategoriId = sb.sk_id
                        ORDER BY sl2.Sesi
                    ) as distinct_sesi
                ) as sesi_info,
                (
                    SELECT json_agg(json_build_object(
                        'teks', teks,
                        'rating', rating,
                        'tanggal', tanggal
                    ))
                    FROM (
                        SELECT DISTINCT t2.Teks as teks, t2.Rating as rating, t2.Tgl as tanggal
                        FROM TESTIMONI t2
                        JOIN TR_PEMESANAN_JASA tpj2 ON t2.IdTrPemesanan = tpj2.Id
                        WHERE tpj2.IdKategoriJasa = sb.sk_id
                    ) as distinct_testimoni
                ) as testimoni_info,
                (
                    SELECT ROUND(AVG(t2.Rating)::numeric, 2)
                    FROM TESTIMONI t2
                    JOIN TR_PEMESANAN_JASA tpj2 ON t2.IdTrPemesanan = tpj2.Id
                    WHERE tpj2.IdKategoriJasa = sb.sk_id
                ) as avg_rating
            FROM 
                SubkategoriBase sb`,
            [subkategoriId]
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/get-metode-bayar', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM metode_bayar' // Query yang akan dijalankan
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

router.get('/check-discount', async (req, res) => {
    try {
        const results = await client.query(
            'SELECT * FROM diskon' // Query yang akan dijalankan
        );
        res.json(results.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

router.post('/insert-pemesanan-jasa', async (req, res) => {
    const { tanggal, idPelanggan, idKategori, totalHarga, idMetodeBayar } = req.query;
    try {
        // Pertama, harus bikin diskon baru sebagai syarat voucher
        await client.query(
            'INSERT INTO tr_pemesanan_jasa (tglpemesanan, idpelanggan, idkategorijasa, totalbiaya, idmetodebayar) VALUES ($1, $2, $3, $4,$5)',
            [tanggal, idPelanggan, idKategori, totalHarga, idMetodeBayar]
        );
        res.json("Data inserted successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error inserting data');
    }
});

export default router;