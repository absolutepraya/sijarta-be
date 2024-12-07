// WARNING: JANGAN ada yang dihapus atau diubah di file ini, soalnya ini entry point BE nya. - Abhip

import express from 'express';
import { config } from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';

// Routes
import blueRoute from './routes/blue.js';
import greenRoute from './routes/green.js';
import redRoute from './routes/red.js';
import yellowRoute from './routes/yellow.js';

// Load environment variables
config();

const app = express();

// Middlewares
app.use(cors());               // Allow cross-origin requests
app.use(morgan('dev'));        // Logging

// Sample Route
app.get('/', (req, res) => {
	res.send('Bombalabomba!');
});

// Use routes
app.use('/blue', blueRoute);
app.use('/green', greenRoute);
app.use('/red', redRoute);
app.use('/yellow', yellowRoute);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`=> Server running on port ${PORT}`);
});
