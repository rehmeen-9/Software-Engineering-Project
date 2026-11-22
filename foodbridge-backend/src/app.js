const express = require('express');
const cors = require('cors');

const app = express();
const pool = require('./config/db');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Check database connection
app.get('/health/db', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(503).json({
            status: 'error',
            database: 'disconnected'
        });
    }
});

app.get('/test-auth', (req, res) => {
    res.json({ message: 'Auth server is working!' });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/listings', require('./routes/listings.routes'));

module.exports = app;

