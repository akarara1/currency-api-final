const express = require('express');
const axios = require('axios');
const redis = require('redis');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Currency Exchange API",
            version: "1.0.0",
            description: "API to convert currencies using ApyHub and Redis caching",
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: "Local server"
            }
        ],
    },
    apis: ["./index.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const redisClient = redis.createClient({
    url: `redis://${process.env.NODE_ENV === 'development' ? 'localhost' : 'redis-cache'}:6379`
});

redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

redisClient.connect().catch(console.error);

app.use(express.json());

/**
 * @swagger
 * /convert:
 *   post:
 *     summary: Convert currencies
 *     description: Fetches exchange rates between a source currency and one or more target currencies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 description: The source currency code (e.g., 'usd').
 *                 example: "usd"
 *               targets:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: The target currency codes (e.g., ['eur', 'inr']).
 *                 example: ["eur", "inr"]
 *               date:
 *                 type: string
 *                 description: Optional date in yyyy-mm-dd format. Defaults to today.
 *                 example: "2023-10-01"
 *     responses:
 *       200:
 *         description: Returns the exchange rates for the target currencies.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 source:
 *                   type: string
 *                 conversions:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                     description: The exchange rate for the target currency.
 *       400:
 *         description: Bad request due to missing or invalid parameters.
 *       500:
 *         description: Internal server error.
 */
app.post('/convert', async (req, res) => {
    const { source, targets, date } = req.body;

    if (!source || !targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: "'source' and 'targets' (as an array) currencies are required." });
    }

    const lowerCaseSource = source.toLowerCase();
    const results = {};

    const handleTargetConversion = async (target) => {
        const lowerCaseTarget = target.toLowerCase();
        const cacheKey = `${lowerCaseSource}:${lowerCaseTarget}:${date || 'today'}`;

        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }

            const response = await axios.post(
                'https://api.apyhub.com/data/convert/currency/multiple',
                {
                    source: lowerCaseSource,
                    targets: [lowerCaseTarget],
                    date: date
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'apy-token': process.env.APY_API_KEY
                    }
                }
            );

            const conversionRate = response.data[`${lowerCaseSource}_${lowerCaseTarget}`];

            if (!conversionRate) {
                throw new Error(`Conversion rate for ${lowerCaseTarget} not found.`);
            }

            await redisClient.setEx(cacheKey, 3600, JSON.stringify(conversionRate));
            return conversionRate;
        } catch (error) {
            throw new Error(`Failed to fetch exchange rate for ${lowerCaseTarget}`);
        }
    };

    for (let target of targets) {
        try {
            results[target] = await handleTargetConversion(target);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    res.json({
        source: lowerCaseSource,
        conversions: results,
    });
});

module.exports = app;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
