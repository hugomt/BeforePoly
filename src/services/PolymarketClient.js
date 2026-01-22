const { ClobClient, OrderType, Side } = require("@polymarket/clob-client");
const { Wallet } = require("ethers");
require("dotenv").config();

class PolymarketClient {
  constructor() {
    this.baseUrl = "https://clob.polymarket.com";
    this.chainId = 137; // Polygon
    this.privateKey = process.env.PRIVATE_KEY;

    if (!this.privateKey) {
      console.error("❌ Error: PRIVATE_KEY no está configurada en .env");
      process.exit(1);
    }

    this.signer = new Wallet(this.privateKey);
    this.client = null;
    this.initialized = false;
  }

  /**
   * Inicializar cliente CLOB
   * Esto genera automáticamente las credenciales L2 desde tu PRIVATE_KEY
   */
  async initialize() {
    try {
      if (this.initialized) {
        return this.client;
      }

      console.log("\n🔐 Inicializando Polymarket CLOB Client...");
      console.log(`   Wallet: ${this.signer.address}`);
      console.log(`   Chain: ${this.chainId}`);

      // Crear cliente CLOB
      // Esto automáticamente:
      // 1. Genera credenciales L2 desde tu PRIVATE_KEY
      // 2. Las autentica con Polymarket
      this.client = new ClobClient(
        this.baseUrl,
        this.chainId,
        this.signer
      );

      console.log("✅ CLOB Client inicializado correctamente");
      this.initialized = true;
      return this.client;
    } catch (error) {
      console.error("❌ Error inicializando CLOB Client:", error.message);
      throw error;
    }
  }

  /**
   * Crear orden en Polymarket
   */
  async createOrder(conditionId, side, price, size, orderType = "FOK") {
    try {
      // Asegurar que el cliente está inicializado
      if (!this.client) {
        await this.initialize();
      }

      const sideEnum = side.toUpperCase() === "BUY" ? Side.BUY : Side.SELL;
      const orderTypeEnum = orderType === "FOK" ? OrderType.FOK : OrderType.GTC;

      const payload = {
        conditionId: conditionId,
        side: sideEnum,
        price: parseFloat(price),
        size: parseInt(size),
      };

      console.log(`📤 Creando orden...`);
      console.log(` Condition ID: ${conditionId}`);
      console.log(` Lado: ${sideEnum === Side.BUY ? "COMPRA 🔴" : "VENTA 🟢"}`);
      console.log(` Precio: $${price}`);
      console.log(` Tamaño: ${size} shares`);
      console.log(` Tipo: ${orderTypeEnum === OrderType.FOK ? "FOK (rápido)" : "GTC"}`);

      // Crear y enviar orden
      const response = await this.client.createAndPostOrder(
        payload,
        {}, // options (podemos dejar vacío)
        orderTypeEnum
      );

      console.log(`✅ Orden enviada exitosamente`);
      console.log(` Order ID: ${response}`);

      return {
        id: response,
        conditionId: conditionId,
        side: side,
        price: price,
        size: size,
        status: "PENDING",
      };
    } catch (error) {
      console.error(`\n❌ Error creando orden:`);
      console.error(` ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener órdenes activas del usuario
   */
  async getActiveOrders() {
    try {
      if (!this.client) {
        await this.initialize();
      }

      const orders = await this.client.getOrders(this.signer.address);
      return orders;
    } catch (error) {
      console.error("❌ Error obteniendo órdenes:", error.message);
      throw error;
    }
  }

  /**
   * Cancelar una orden
   */
  async cancelOrder(orderId) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      const response = await this.client.cancelOrder(orderId);
      console.log(`✅ Orden cancelada: ${orderId}`);
      return response;
    } catch (error) {
      console.error("❌ Error cancelando orden:", error.message);
      throw error;
    }
  }

  /**
   * Test de autenticación
   */
  async testAuth() {
    try {
      console.log("\n🧪 Test de autenticación...");
      await this.initialize();
      
      // Intentar obtener órdenes para validar autenticación
      console.log("📋 Obteniendo órdenes activas...");
      const orders = await this.getActiveOrders();
      
      console.log(`✅ Autenticación correcta`);
      console.log(`   Órdenes activas: ${orders.length || 0}`);
      return true;
    } catch (error) {
      console.error("❌ Error de autenticación:", error.message);
      return false;
    }
  }
}

module.exports = PolymarketClient;