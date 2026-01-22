require('dotenv').config();

const http = require('http');
const WebSocket = require('ws');
const PolymarketClient = require('./services/PolymarketClient');
const EventManager = require('./services/EventManager');

class BeforePolyServer {
  constructor() {
    this.port = 3000;
    this.polymarketClient = new PolymarketClient();
    this.eventManager = new EventManager();
    this.currentMatch = null;
    this.score = { local: 0, visitante: 0 };
    this.clients = new Set();
    this.TESTING_MODE = false;
    this.EXECUTION_TIMEOUT = 5000;
  }

  start() {
    const server = http.createServer(this._handleHttpRequest.bind(this));

    this.polymarketClient.initialize().catch(err => {
      console.error("⚠️ Advertencia: No se pudo conectar a Polymarket:", err.message);
    });

    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
      console.log(`\n✅ Cliente conectado`);

      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'currentMatch',
        data: { match: this.currentMatch, score: this.score },
      }));

      ws.on('message', async (message) => {
        await this._handleMessage(ws, message);
      });

      ws.on('close', () => {
        console.log('❌ Cliente desconectado');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Error WebSocket:', error.message);
      });
    });

    server.listen(this.port, () => {
      console.log(`\n🚀 Servidor BeforePoly ejecutándose en http://localhost:${this.port}`);
      console.log(`🌐 Abre en tu navegador: http://localhost:${this.port}`);
    });
  }

  _handleHttpRequest(req, res) {
    if (req.url === '/' || req.url === '/index.html') {
      const fs = require('fs');
      const html = fs.readFileSync('./public/index.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/style.css') {
      const fs = require('fs');
      const css = fs.readFileSync('./public/style.css', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(css);
    } else if (req.url === '/app.js') {
      const fs = require('fs');
      const js = fs.readFileSync('./public/app.js', 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(js);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  async _handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'loadEvent':
          await this._loadEvent(ws, data.slug);
          break;
        case 'goalLocal':
          this._handleGoal('local', ws, data);
          break;
        case 'goalVisitante':
          this._handleGoal('visitante', ws, data);
          break;
        case 'updateScore':
          this.score = data.score;
          this._broadcastUpdate();
          break;
        case 'reset':
          this._resetMatch();
          this._broadcastUpdate();
          break;
        default:
          console.log('Mensaje desconocido:', data.type);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  async _loadEvent(ws, slug) {
    try {
      const startTime = performance.now();
      console.log(`\n📍 Cargando evento: ${slug}`);

      const eventData = await this.eventManager.processEventData(slug);
      this.currentMatch = eventData;
      this.score = { local: 0, visitante: 0 };

      const loadTime = (performance.now() - startTime).toFixed(0);
      console.log(`✅ Evento cargado en ${loadTime}ms`);
      console.log(` Equipos: ${eventData.teams.local} vs ${eventData.teams.visitante}`);
      console.log(` Mercados encontrados: ${eventData.markets.length}\n`);

      this._broadcastUpdate();
    } catch (error) {
      console.error('❌ Error cargando evento:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'No se pudo cargar el evento. Verifica el slug.',
      }));
    }
  }

  async _handleGoal(team, ws, data) {
    const goalTime = performance.now();
    try {
      if (!this.currentMatch) {
        throw new Error('No hay evento cargado');
      }

      this.score[team]++;
      console.log(`\n⚽ ¡GOL ${team.toUpperCase()}!`);
      console.log(` Marcador: ${this.score.local} - ${this.score.visitante}`);

      const quantity = parseFloat(data.quantity) || 1;
      const maxPrice = parseFloat(data.maxPrice) || 0.95;

      await this._executePurchases(team, quantity, maxPrice);

      const totalTime = (performance.now() - goalTime).toFixed(0);
      console.log(`\n⏱️ Tiempo total GOL → ÓRDENES: ${totalTime}ms\n`);

      this._broadcastUpdate();
    } catch (error) {
      console.error('❌ Error en gol:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  async _executePurchases(team, quantity, maxPrice) {
    const executionStartTime = performance.now();
    if (!this.currentMatch) return;

    const markets = this.currentMatch.markets;
    const score = this.score;

    console.log(`\n💰 Analizando ${markets.length} mercados...`);

    const purchaseOpportunities = [];

    for (const market of markets) {
      const key = market.key;
      const totalScore = score.local + score.visitante;

      if (
        (key === 'btts' && score.local > 0 && score.visitante > 0) ||
        (key === 'over_1_5' && totalScore >= 2) ||
        (key === 'over_2_5' && totalScore >= 3) ||
        (key === 'over_3_5' && totalScore >= 4) ||
        (key === 'over_4_5' && totalScore >= 5)
      ) {
        purchaseOpportunities.push({
          market,
          condition: this._getConditionName(key),
          price: market.yesPrice,
        });
      }
    }

    console.log(`✅ Oportunidades encontradas: ${purchaseOpportunities.length}`);

    const executionPromises = purchaseOpportunities.map((opportunity, index) =>
      this._executeOrderWithOptimization(opportunity, quantity, maxPrice, index)
    );

    await Promise.all(executionPromises);

    const executionTime = (performance.now() - executionStartTime).toFixed(0);
    console.log(`⚡ Todas las órdenes procesadas en ${executionTime}ms`);
  }

  async _executeOrderWithOptimization(opportunity, quantity, maxPrice, orderIndex) {
    const orderStartTime = performance.now();
    try {
      const currentPrice = parseFloat(opportunity.price);
      const adaptivePrice = this._calculateAdaptivePrice(currentPrice, maxPrice, orderIndex);

      console.log(`\n📊 Orden #${orderIndex + 1}: ${opportunity.condition}`);
      console.log(` Precio mercado: $${currentPrice.toFixed(4)}`);
      console.log(` Precio enviado: $${adaptivePrice.toFixed(4)} ⚡ (optimizado)`);
      console.log(` Cantidad: ${quantity} shares`);

      if (this.TESTING_MODE) {
        const fakeOrderId = `0x${Math.random().toString(16).slice(2, 16)}`;
        console.log(`✅ [TESTING] Orden simulada: ${fakeOrderId}`);
        const orderTime = (performance.now() - orderStartTime).toFixed(0);
        console.log(` ⏱️ ${orderTime}ms`);
      } else {
        // ⚡ CORRECCIÓN: Usar yesTokenId parseado desde clobTokenIds
        const orderPromise = this.polymarketClient.createOrder(
          opportunity.market.yesTokenId,  // ← CORRECTO: yesTokenId
          'BUY',
          adaptivePrice,
          quantity,
          'FOK'
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), this.EXECUTION_TIMEOUT)
        );

        const order = await Promise.race([orderPromise, timeoutPromise]);

        console.log(`✅ Orden ejecutada: ${order.id}`);
        const orderTime = (performance.now() - orderStartTime).toFixed(0);
        console.log(` ⏱️ ${orderTime}ms`);
      }
    } catch (error) {
      const errorTime = (performance.now() - orderStartTime).toFixed(0);
      console.error(`❌ Error orden #${orderIndex + 1}: ${error.message} (${errorTime}ms)`);
    }
  }

  _calculateAdaptivePrice(currentPrice, maxPrice, orderIndex) {
    if (currentPrice < maxPrice) {
      const aggressiveness = Math.max(0.98, 1 - (orderIndex * 0.005));
      return parseFloat((currentPrice * aggressiveness).toFixed(4));
    }
    return parseFloat(maxPrice.toFixed(4));
  }

  _getConditionName(key) {
    const conditions = {
      'btts': 'Ambos marcan',
      'over_1_5': 'Más de 1.5',
      'over_2_5': 'Más de 2.5',
      'over_3_5': 'Más de 3.5',
      'over_4_5': 'Más de 4.5',
    };
    return conditions[key] || key;
  }

  _resetMatch() {
    this.score = { local: 0, visitante: 0 };
    console.log('\n🔄 Marcador resetado\n');
  }

  _broadcastUpdate() {
    const message = JSON.stringify({
      type: 'update',
      data: {
        match: this.currentMatch,
        score: this.score,
      },
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

const server = new BeforePolyServer();
server.start(); 