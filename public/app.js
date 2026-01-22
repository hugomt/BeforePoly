class BeforePolyApp {
  constructor() {
    this.ws = null;
    this.currentMatch = null;
    this.score = { local: 0, visitante: 0 };
    this.history = [];
    this.initWebSocket();
    this.attachEventListeners();
  }

  /**
   * Inicializar WebSocket
   */
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onopen = () => {
      console.log('✅ Conectado al servidor');
      this.showMessage('✅ Conectado al servidor', 'success');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this._handleMessage(data);
    };

    this.ws.onerror = () => {
      console.error('❌ Error de conexión WebSocket');
      this.showMessage('❌ Error de conexión. Recarga la página.', 'error');
    };

    this.ws.onclose = () => {
      console.warn('⚠️ Desconectado del servidor');
      this.showMessage('⚠️ Desconectado del servidor', 'error');
      setTimeout(() => this.initWebSocket(), 3000);
    };
  }

  /**
   * Manejar mensajes del servidor
   */
  _handleMessage(data) {
    if (data.type === 'currentMatch') {
      this.currentMatch = data.data.match;
      this.score = data.data.score;
      this.render();
    } else if (data.type === 'update') {
      this.currentMatch = data.data.match;
      this.score = data.data.score;
      this.render();
    } else if (data.type === 'error') {
      this.showMessage(`❌ ${data.message}`, 'error');
    }
  }

  /**
   * Adjuntar event listeners
   */
  attachEventListeners() {
    document.getElementById('loadEventBtn').addEventListener('click', () => {
      this.loadEvent();
    });

    document.getElementById('eventSlug').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.loadEvent();
      }
    });

    document.getElementById('goalLocalBtn').addEventListener('click', () => {
      this.recordGoal('local');
    });

    document.getElementById('goalVisitanteBtn').addEventListener('click', () => {
      this.recordGoal('visitante');
    });

    document.getElementById('varLocalBtn').addEventListener('click', () => {
      this.cancelGoal('local');
    });

    document.getElementById('varVisitanteBtn').addEventListener('click', () => {
      this.cancelGoal('visitante');
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetMatch();
    });
  }

  /**
   * Cargar evento
   */
  loadEvent() {
    const input = document.getElementById('eventSlug').value.trim();

    if (!input) {
      this.showMessage('Por favor ingresa un slug o URL', 'error');
      return;
    }

    let slug = input;
    const match = input.match(/\/event\/([a-z0-9\-]+)/i);
    if (match) {
      slug = match[1];
    }

    console.log('📍 Cargando evento:', slug);
    this.showMessage('⏳ Cargando evento...', 'info');

    this.ws.send(
      JSON.stringify({
        type: 'loadEvent',
        slug: slug,
      })
    );
  }

  /**
   * Registrar gol
   */
  recordGoal(team) {
    if (!this.currentMatch) {
      this.showMessage('❌ Carga un evento primero', 'error');
      return;
    }

    const quantity = parseFloat(document.getElementById('quantity').value) || 1;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || 0.9;

    console.log(`⚽ Gol ${team}: ${quantity} shares a máx $${maxPrice}`);

    const messageType = team === 'local' ? 'goalLocal' : 'goalVisitante';

    this.ws.send(
      JSON.stringify({
        type: messageType,
        quantity,
        maxPrice,
      })
    );
  }

  /**
   * Cancelar gol (VAR)
   */
  cancelGoal(team) {
    if (!this.currentMatch) {
      this.showMessage('❌ Carga un evento primero', 'error');
      return;
    }

    if (this.score[team] <= 0) {
      this.showMessage(`❌ No hay goles para anular en ${team}`, 'error');
      return;
    }

    this.score[team]--;

    console.log(`❌ VAR: Gol anulado ${team}. Nuevo marcador: ${this.score.local} - ${this.score.visitante}`);

    this.showMessage(`⚠️ VAR: Gol anulado ${team.toUpperCase()}`, 'warning');

    this.ws.send(
      JSON.stringify({
        type: 'updateScore',
        score: this.score,
      })
    );

    this.render();
  }

  /**
   * Resetear marcador
   */
  resetMatch() {
    this.ws.send(JSON.stringify({ type: 'reset' }));
  }

  /**
   * Renderizar interfaz
   */
  render() {
    const matchSection = document.getElementById('matchSection');

    if (!this.currentMatch) {
      matchSection.classList.add('hidden');
      return;
    }

    matchSection.classList.remove('hidden');

    document.getElementById('matchTitle').textContent = this.currentMatch.event.title;
    document.getElementById('localTeamName').textContent = this.currentMatch.teams.local;
    document.getElementById('visitanteTeamName').textContent =
      this.currentMatch.teams.visitante;

    document.getElementById('scoreLocal').textContent = this.score.local;
    document.getElementById('scoreVisitante').textContent = this.score.visitante;

    this.renderMarkets();
  }

  /**
   * Renderizar lista de mercados CON PRECIOS
   */
  renderMarkets() {
    const marketsList = document.getElementById('marketsList');

    if (!this.currentMatch || !this.currentMatch.markets) {
      marketsList.innerHTML = '<p class="empty">Sin mercados</p>';
      return;
    }

    const markets = this.currentMatch.markets;

    if (markets.length === 0) {
      marketsList.innerHTML = '<p class="empty">Sin mercados disponibles</p>';
      return;
    }

    marketsList.innerHTML = markets
      .map(
        (market) => `
            <div class="market-item">
              <div class="market-item-title">${market.name}</div>
              <div class="market-item-question">${market.question}</div>
              <div class="market-item-price">
                💰 Precio: <strong>$${market.yesPrice}</strong>
              </div>
            </div>
          `
      )
      .join('');
  }

  /**
   * Mostrar mensaje
   */
  showMessage(message, type = 'info') {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = `error-message show`;

    if (type === 'success' || type === 'info') {
      errorDiv.style.borderColor = '#10b981';
      errorDiv.style.color = '#a7f3d0';
    }

    setTimeout(() => {
      errorDiv.classList.remove('show');
    }, 5000);
  }
}

// Inicializar app cuando cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando BeforePoly App');
  window.app = new BeforePolyApp();
});
