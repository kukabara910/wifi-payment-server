const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Replace with your own Etherscan API key and wallet address
const ETHERSCAN_API_KEY = 'PCVR7QFBPK3KTE5PJZZ6QWSWGE4FSHDHUY';
const YOUR_WALLET_ADDRESS = '0xD42aeDC8B3aF24192288602892D3F77a4Ef6dAc8';

app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/check-payment', async (req, res) => {
    const { token, expectedTokenAmount } = req.body;
    console.log('Received payment check request:', req.body);

    const tokenContracts = {
        usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    };

    const tokenAddress = tokenContracts[token.toLowerCase()];
    if (!tokenAddress) {
        return res.json({ success: false, message: 'Unsupported token' });
    }

    try {
        const url = `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${YOUR_WALLET_ADDRESS}&page=1&offset=10&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Etherscan data:", data); // ← Debug output

        const matched = data.result.find(tx => {
            const amount = Number(tx.value) / (10 ** tx.tokenDecimal);
            console.log("Checking tx:", {
                hash: tx.hash,
                to: tx.to,
                from: tx.from,
                amount: amount,
                tokenSymbol: tx.tokenSymbol
            });

            return (
                amount >= expectedTokenAmount &&
                tx.to.toLowerCase() === YOUR_WALLET_ADDRESS.toLowerCase()
            );
        });

        if (matched) {
            return res.json({ success: true, tx: matched.hash });
        } else {
            return res.json({ success: false, message: 'No matching transaction yet' });
        }

    } catch (err) {
        console.error('Error checking Etherscan:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
