// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Load available plans from plans.json
app.get('/api/plans', (req, res) => {
  fs.readFile('plans.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading plans.json:", err);
      return res.status(500).json({ error: 'Failed to load plans' });
    }
    res.json(JSON.parse(data));
  });
});

const config = {
  base: {
    address: '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8',
    usdt: '0x...',
    usdc: '0x...',
    explorer: 'https://basescan.org/tx/'
  },
  ethereum: {
    address: '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorer: 'https://etherscan.io/tx/'
  },
  bsc: {
    address: '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8',
    usdt: '0x55d398326f99059fF775485246999027B3197955',
    usdc: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    explorer: 'https://bscscan.com/tx/'
  },
  solana: {
    address: '86dWGLeb5GuV46tQcDu5cLN3BJvVCJYrP7hnf8ekmVvK',
    explorer: 'https://solscan.io/tx/'
  }
};

const etherscanAPIs = {
  ethereum: 'https://api.etherscan.io',
  base: 'https://api.basescan.org',
  bsc: 'https://api.bscscan.com'
};

app.post('/api/check-payment', async (req, res) => {
  const { network, token, expectedTokenAmount } = req.body;
  console.log('Received payment check request:', req.body);

  if (network === 'solana') {
    return res.status(400).json({ success: false, message: 'Solana support not implemented yet' });
  }

  const settings = config[network];
  if (!settings) {
    return res.status(400).json({ success: false, message: 'Unsupported network' });
  }

  const tokenAddress = settings[token.toLowerCase()];
  const apiBase = etherscanAPIs[network];
  const wallet = settings.address;
  const explorer = settings.explorer;
  const apiKey = 'YOUR_API_KEY'; // Replace with real API key

  const url = `${apiBase}/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${wallet}&sort=desc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Explorer data:", data);

    const match = data.result.find(tx => {
      const amt = Number(tx.value) / (10 ** tx.tokenDecimal);
      return tx.to.toLowerCase() === wallet.toLowerCase() && amt >= expectedTokenAmount;
    });

    if (match) {
      return res.json({
        success: true,
        message: 'Payment verified',
        txHash: match.hash,
        explorerLink: explorer + match.hash
      });
    } else {
      return res.json({ success: false, message: 'Payment not found yet' });
    }
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
