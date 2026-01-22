const axios = require('axios');

class EventManager {
  constructor() {
    this.GAMMA_API = 'https://gamma-api.polymarket.com';
  }

  /**
   * Procesar datos de evento desde Gamma API
   */
  async processEventData(slug) {
    try {
      // Buscar mercados asociados al slug
      const marketsResponse = await axios.get(`${this.GAMMA_API}/markets`, {
        params: { slug },
      });

      const markets = marketsResponse.data;

      if (!markets || markets.length === 0) {
        throw new Error(`No markets found for slug: ${slug}`);
      }

      // Extraer info del evento (usar primer mercado como referencia)
      const firstMarket = markets;
      const eventSlug = firstMarket.eventSlug || slug;

      // Buscar evento para obtener nombres de equipos
      const eventsResponse = await axios.get(`${this.GAMMA_API}/events`, {
        params: { slug: eventSlug },
      });

      const events = eventsResponse.data;
      if (!events || events.length === 0) {
        throw new Error(`Event not found for slug: ${eventSlug}`);
      }

      const event = events;
      const teamNames = this._extractTeamNames(event);

      // Procesar mercados y extraer tokenIds
      const processedMarkets = this._processMarkets(markets);

      return {
        slug: eventSlug,
        teams: teamNames,
        markets: processedMarkets,
      };
    } catch (error) {
      console.error('❌ Error en EventManager:', error.message);
      throw error;
    }
  }

  /**
   * Extraer nombres de equipos desde el evento
   */
  _extractTeamNames(event) {
    // Prioridad: teamAID/teamBID > outcomes > genéricos
    let local = 'Team A';
    let visitante = 'Team B';

    if (event.teamAID && event.teamBID) {
      local = event.teamAID;
      visitante = event.teamBID;
    } else if (
      event.outcomes &&
      Array.isArray(event.outcomes) &&
      event.outcomes.length >= 2
    ) {
      local = event.outcomes;
      visitante = event.outcomes;
    }

    return { local, visitante };
  }

  /**
   * Procesar mercados y extraer tokenIds correctamente
   */
  _processMarkets(markets) {
    const processedMarkets = [];

    for (const market of markets) {
      // Detectar tipo de mercado por título
      const title = (market.question || market.title || '').toLowerCase();
      const key = this._detectMarketType(title);

      if (!key) continue; // Skip si no es un mercado reconocido

      // ⚡ CRÍTICO: Parsear clobTokenIds correctamente
      let yesTokenId = null;
      let noTokenId = null;

      if (market.clobTokenIds) {
        try {
          // clobTokenIds es un string JSON: "[\"123\", \"456\"]"
          const tokenIds = JSON.parse(market.clobTokenIds);
          if (Array.isArray(tokenIds) && tokenIds.length >= 2) {
            yesTokenId = tokenIds; // Token para YES outcome
            noTokenId = tokenIds; // Token para NO outcome
          }
        } catch (e) {
          console.warn(
            `⚠️  Could not parse clobTokenIds for market ${market.id}: ${e.message}`
          );
          continue; // Skip si no podemos parsear
        }
      }

      if (!yesTokenId || !noTokenId) {
        console.warn(`⚠️  Missing tokenIds for market ${market.id}`);
        continue;
      }

      // Obtener precios
      const outcomePrices = this._parseOutcomePrices(market.outcomePrices);
      const yesPrice = outcomePrices.yes || 0.5;
      const noPrice = outcomePrices.no || 0.5;

      processedMarkets.push({
        id: market.id,
        key,
        title: market.question || market.title,
        conditionId: market.conditionId,
        // ⚡ IMPORTANTE: Aquí están los tokenIds correctamente parseados
        yesTokenId, // String: Token ID para comprar YES
        noTokenId, // String: Token ID para comprar NO
        yesPrice, // Precio actual para YES
        noPrice, // Precio actual para NO
      });
    }

    return processedMarkets;
  }

  /**
   * Detectar tipo de mercado por título
   */
  _detectMarketType(title) {
    if (
      title.includes('both teams') ||
      title.includes('ambos') ||
      title.includes('btts')
    ) {
      return 'btts';
    }
    if (
      title.includes('over 1.5') ||
      title.includes('más de 1.5') ||
      title.includes('1,5')
    ) {
      return 'over_1_5';
    }
    if (
      title.includes('over 2.5') ||
      title.includes('más de 2.5') ||
      title.includes('2,5')
    ) {
      return 'over_2_5';
    }
    if (
      title.includes('over 3.5') ||
      title.includes('más de 3.5') ||
      title.includes('3,5')
    ) {
      return 'over_3_5';
    }
    if (
      title.includes('over 4.5') ||
      title.includes('más de 4.5') ||
      title.includes('4,5')
    ) {
      return 'over_4_5';
    }

    return null;
  }

  /**
   * Parsear outcomePrices desde la API
   */
  _parseOutcomePrices(outcomePrices) {
    const prices = { yes: 0.5, no: 0.5 };

    if (!outcomePrices) return prices;

    try {
      if (typeof outcomePrices === 'string') {
        const parsed = JSON.parse(outcomePrices);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          prices.yes = parseFloat(parsed) || 0.5;
          prices.no = parseFloat(parsed) || 0.5;
        }
      } else if (Array.isArray(outcomePrices) && outcomePrices.length >= 2) {
        prices.yes = parseFloat(outcomePrices) || 0.5;
        prices.no = parseFloat(outcomePrices) || 0.5;
      } else if (typeof outcomePrices === 'object') {
        prices.yes = parseFloat(outcomePrices.yes || outcomePrices) || 0.5;
        prices.no = parseFloat(outcomePrices.no || outcomePrices) || 0.5;
      }
    } catch (e) {
      // Fallback a precios por defecto
    }

    return prices;
  }
}

module.exports = EventManager;