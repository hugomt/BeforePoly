require('dotenv').config();
const PolymarketClient = require('./src/services/PolymarketClient');

const client = new PolymarketClient();
client.testAuth();