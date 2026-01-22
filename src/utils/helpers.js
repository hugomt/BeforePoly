/**
 * Utilidades y funciones helper
 */

/**
 * Formatear número como moneda
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * Formatear timestamp a hora legible
 */
function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('es-ES');
}

/**
 * Mostrar línea separadora
 */
function printSeparator() {
  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Mostrar título con bordes
 */
function printTitle(title) {
  const padding = Math.max(0, (60 - title.length) / 2);
  console.log('\n' + '═'.repeat(60));
  console.log(' '.repeat(Math.floor(padding)) + title);
  console.log('═'.repeat(60) + '\n');
}

/**
 * Validar si es un token ID válido (formato hex)
 */
function isValidTokenId(tokenId) {
  return /^0x[a-fA-F0-9]{64}$/.test(tokenId);
}

/**
 * Validar si es un precio válido
 */
function isValidPrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0 && num <= 1;
}

/**
 * Validar si es una cantidad válida
 */
function isValidAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

module.exports = {
  formatCurrency,
  formatTime,
  printSeparator,
  printTitle,
  isValidTokenId,
  isValidPrice,
  isValidAmount,
};
