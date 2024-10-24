const request = require('supertest');
const http = require('http');  // Import http to create the server
const app = require('../index');  // Import the app for testing

jest.mock('redis', () => {
    const mClient = {
        connect: jest.fn().mockResolvedValue(),
        get: jest.fn(),
        setEx: jest.fn(),
        on: jest.fn(),
    };
    return {
        createClient: jest.fn(() => mClient),
    };
});

jest.mock('axios');

const redisClient = require('redis').createClient();
const axios = require('axios');

describe('Currency Exchange API', () => {
    let server;

    // Start the server before each test
    beforeEach((done) => {
        server = http.createServer(app).listen(701, done);  // Start server on port 701
    });

    // Close the server and any open connections after each test
    afterEach((done) => {
        server.close(done);  // Ensure the server is properly closed after each test
        jest.clearAllMocks();  // Clear all mocks after each test
    });

    test('should return 400 if source or targets are missing', async () => {
        const response = await request(server).post('/convert').send({
            targets: ['usd'],
        });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("'source' and 'targets' (as an array) currencies are required.");
    });

    test('should return cached data if available', async () => {
        // Mock Redis cache hit
        redisClient.get.mockResolvedValue(JSON.stringify(1.18));

        const response = await request(server).post('/convert').send({
            source: 'usd',
            targets: ['eur'],
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.conversions).toEqual({ eur: 1.18 });
        expect(redisClient.get).toHaveBeenCalledWith('usd:eur:today');
    });

    test('should fetch data from API if cache miss', async () => {
        // Mock Redis cache miss
        redisClient.get.mockResolvedValue(null);

        // Mock API response
        axios.post.mockResolvedValue({
            data: {
                usd_eur: 1.18,
            },
        });

        const response = await request(server).post('/convert').send({
            source: 'usd',
            targets: ['eur'],
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.conversions).toEqual({ eur: 1.18 });
        expect(redisClient.get).toHaveBeenCalledWith('usd:eur:today');
        expect(redisClient.setEx).toHaveBeenCalledWith('usd:eur:today', 3600, JSON.stringify(1.18));
    });

    test('should return 500 if API fails', async () => {
        // Mock Redis cache miss
        redisClient.get.mockResolvedValue(null);

        // Mock API failure
        axios.post.mockRejectedValue(new Error('API failed'));

        const response = await request(server).post('/convert').send({
            source: 'usd',
            targets: ['eur'],
        });

        expect(response.statusCode).toBe(500);
        expect(response.body.error).toBe('Failed to fetch exchange rate for eur');
    });
});
