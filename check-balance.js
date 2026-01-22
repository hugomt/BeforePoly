require('dotenv').config();
const { ethers } = require('ethers');

const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey);
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

async function checkBalance() {
  try {
    console.log('\n🔍 Verificando balances en Polygon...\n');
    console.log(`📍 Dirección: ${wallet.address}`);
    
    // Balance MATIC/POL nativo
    const maticBalance = await provider.getBalance(wallet.address);
    const maticFormatted = ethers.formatEther(maticBalance);
    console.log(`⛽ POL/MATIC: ${maticFormatted} POL`);
    
    // ✅ USDC NATIVE (nuevo contrato de Circle)
    const usdcAddress = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // CAMBIADO
    const usdcAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ];
    
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const decimals = await usdcContract.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, decimals);
    
    console.log(`💵 USDC (Native): $${parseFloat(usdcFormatted).toFixed(2)} USDC`);
    
    // Verificar fondos
    console.log('\n✅ Verificación de fondos:\n');
    
    if (parseFloat(maticFormatted) > 0.01) {
      console.log(`✅ POL para gas: SUFICIENTE (${maticFormatted} POL)`);
    } else {
      console.log(`❌ POL para gas: INSUFICIENTE (${maticFormatted} POL)`);
      console.log('   → Necesitas comprar ~$0.50-1 de POL');
    }
    
    if (parseFloat(usdcFormatted) > 1) {
      console.log(`✅ USDC para compras: SUFICIENTE ($${usdcFormatted})`);
    } else {
      console.log(`❌ USDC para compras: INSUFICIENTE ($${usdcFormatted})`);
    }
    
    console.log('\n');
    
    if (parseFloat(maticFormatted) > 0.01 && parseFloat(usdcFormatted) > 1) {
      console.log('🚀 ¡LISTO PARA OPERAR!\n');
    } else {
      console.log('⚠️  Solo falta POL para gas. Compra $0.50-1 de POL.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance();
