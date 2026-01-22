const { ethers } = require('ethers');

// Reemplaza CON TU PRIVATE KEY (con 0x al inicio)
const privateKey = '0x2d28b00a5b9f39639afe4988c500f8d14ef210eb012696a37718a3347106a23b'; 

const wallet = new ethers.Wallet(privateKey);

console.log('\n🔑 Verificación de Private Key:\n');
console.log(`Dirección derivada: ${wallet.address}`);
console.log('\n⚠️  Compara esta dirección con tu wallet en MetaMask');
console.log('   Si son IGUALES → Private key es CORRECTA');
console.log('   Si son DIFERENTES → Private key es INCORRECTA\n');
