require('dotenv').config();
const { ethers } = require('ethers');

const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey);
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

async function debugWallet() {
  console.log('\n🔍 DEBUG COMPLETO DE WALLET\n');
  console.log(`📍 Dirección: ${wallet.address}`);
  
  try {
    // 1. Balance nativo POL/MATIC
    console.log('\n--- BALANCE POL/MATIC NATIVO ---');
    const maticBalance = await provider.getBalance(wallet.address);
    console.log(`Balance raw: ${maticBalance.toString()}`);
    console.log(`Balance formateado: ${ethers.formatEther(maticBalance)} POL`);
    
    // 2. Verificar que estamos en Polygon
    console.log('\n--- VERIFICAR RED ---');
    const network = await provider.getNetwork();
    console.log(`Red: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`URL: https://polygon-rpc.com`);
    
    // 3. Leer USDC directamente
    console.log('\n--- VERIFICAR USDC ---');
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)'
    ];
    
    try {
      const usdc = new ethers.Contract(usdcAddress, erc20Abi, provider);
      const balance = await usdc.balanceOf(wallet.address);
      const decimals = await usdc.decimals();
      const symbol = await usdc.symbol();
      const name = await usdc.name();
      
      const formatted = ethers.formatUnits(balance, decimals);
      
      console.log(`Nombre: ${name}`);
      console.log(`Símbolo: ${symbol}`);
      console.log(`Dirección contrato: ${usdcAddress}`);
      console.log(`Balance raw: ${balance.toString()}`);
      console.log(`Decimales: ${decimals}`);
      console.log(`Balance formateado: $${formatted} ${symbol}`);
      
      if (parseFloat(formatted) > 0) {
        console.log(`✅ USDC ENCONTRADO`);
      } else {
        console.log(`❌ Sin USDC en este contrato`);
      }
    } catch (e) {
      console.log(`❌ Error leyendo USDC: ${e.message}`);
    }
    
    // 4. Información final
    console.log('\n--- RESUMEN ---');
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Red: Polygon`);
    console.log(`RPC: https://polygon-rpc.com`);
    console.log(`\nVe a: https://polygonscan.com/address/${wallet.address}`);
    console.log(`Para ver todos tus tokens y transacciones\n`);
    
  } catch (error) {
    console.error('\n❌ Error general:');
    console.error(error.message);
  }
}

debugWallet();
