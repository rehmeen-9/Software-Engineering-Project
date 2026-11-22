   
   const express = require('express');
   const cors = require('cors');

   const app = express();
   app.use(cors());
   app.use(express.json());

   app.get('/health', (req, res) => res.json({ status: 'ok' }));
   app.get('/test-auth', (req, res) => {
    res.json({ message: 'Auth server is working!' });
});
   app.use('/api/auth', require('./routes/auth.routes'));
   app.use('/api/listings', require('./routes/listings.routes'));
   module.exports = app;
