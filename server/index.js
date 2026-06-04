const express = require('express');
const createError = require('http-errors');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./Middlewares/dbConnection');

const app = express();

app.use(helmet());
app.set('trust proxy', 1);

const allowedOrigins = [
    process.env.ALLOWED_ORIGIN_1,
    process.env.ALLOWED_ORIGIN_2,
    process.env.ALLOWED_ORIGIN_3,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true); // server-to-server (webhooks)
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Authorization',
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => res.send('Nexora payments API is running'));

app.use('/api/payments', require('./Routes/payments'));
app.use('/api/subscription', require('./Routes/subscription'));
app.use('/api/admin', require('./Routes/admin'));

// Background sweep: confirm pending on-chain payments even if the payer closed
// the checkout tab.
const { pollPendingOrders } = require('./Controllers/paymentController');
setInterval(() => pollPendingOrders().catch(() => {}), 30000);

// 404 + error handler
app.use((req, res, next) => next(createError(404, 'Not Found')));
app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
        success: false,
        error: { message: err.message || 'Internal Server Error', status: err.status || 500 },
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] Nexora payments API on port ${PORT}`));
