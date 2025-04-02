// server.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Load available plans from wifi_plans.json
app.get('/api/plans', (req, res) => {
  fs.readFile('wifi_plans.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading wifi_plans.json:", err);
      return res.status(500).json({ error: 'Failed to load plans' });
    }
    res.json(JSON.parse(data));
  });
});

// Network/token/wallet config
const config = {
  base: {
    address: '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8',
    usdt: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorer: 'https://basescan.org/tx/'
  },
  ethereum: {
    address: '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdc: '0xa0b86991c6218b36c1d19D4a2e9eb0ce3606eb48',
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
  const { network, token, expectedTokenAmount, plan } = req.body;
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
  const apiKey = 'PCVR7QFBPK3KTE5PJZZ6QWSWGE4FSHDHUY';

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
      // If match, remove code immediately from the list
      fs.readFile('wifi_plans.json', 'utf8', (err, jsonData) => {
        if (!err) {
          let plans = JSON.parse(jsonData);
          const foundPlan = plans.plans.find(p => p.name === plan);
          if (foundPlan && foundPlan.codes && foundPlan.codes.length > 0) {
            foundPlan.codes.shift();
            fs.writeFile('wifi_plans.json', JSON.stringify(plans, null, 2), () => {});
          }
        }
      });

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

// New route to mark a code as used and update wifi_plans.json
app.post('/api/use-code', (req, res) => {
  const { planName } = req.body;

  fs.readFile('wifi_plans.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading wifi_plans.json:", err);
      return res.status(500).json({ error: 'Failed to read plans' });
    }

    let plansData = JSON.parse(data);
    const plan = plansData.plans.find(p => p.name === planName);

    if (plan && plan.codes && plan.codes.length > 0) {
      plan.codes.shift();
     app.post('/api/use-code', (req, res) => {
  const { planName } = req.body;

  console.log(`Received request to decrement code for plan: ${planName}`);

  // Read the wifi_plans.json file
  fs.readFile('wifi_plans.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Failed to read wifi_plans.json:", err);
      return res.status(500).json({ success: false, message: 'Error reading plans' });
    }

    let plansData = JSON.parse(data);
    const plan = plansData.plans.find(p => p.name === planName);

    if (plan && plan.codes.length > 0) {
      const removedCode = plan.codes.shift(); // Remove the first code
      console.log(`Removed code: ${removedCode}. Remaining codes: ${plan.codes}`);

      // Write the updated data back to wifi_plans.json
      fs.writeFile('wifi_plans.json', JSON.stringify(plansData, null, 2), (err) => {
        if (err) {
          console.error("Failed to update wifi_plans.json:", err);
          return res.status(500).json({ success: false, message: 'Error updating plans' });
        }
        console.log("Successfully updated wifi_plans.json");
        return res.json({ success: true, remainingCodes: plan.codes.length });
      });
    } else {
      console.warn("Plan not found or no codes left to remove");
      return res.status(400).json({ success: false, message: 'Plan not found or no codes left' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
