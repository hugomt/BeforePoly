require('dotenv').config();

const config = {
  // Blockchain & API
  privateKey: process.env.PRIVATE_KEY,
  apiUrl: process.env.POLYMARKET_API_URL || 'https://clob.polymarket.com',
  rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',

  // App
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',

  // Validation
  validate() {
    if (!this.privateKey) {
      throw new Error('❌ PRIVATE_KEY no está configurada en .env');
    }
    return true;
  },
};

module.exports = config;
