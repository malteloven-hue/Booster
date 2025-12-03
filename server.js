require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Används för att anropa extern trafik-leverantör

const app = express();
const PORT = process.env.PORT || 3000;

// Tillåt anrop från din Lovable-frontend (CORS)
app.use(cors());
app.use(express.json());

// 1. En enkel test-route för att se att servern lever
app.get('/', (req, res) => {
    res.send('Traffic Backend is running!');
});

// 2. Endpointen som din Lovable-frontend anropar
app.post('/api/start-campaign', async (req, res) => {
    try {
        const { targetUrl, amount, category } = req.body;

        // Enkel validering
        if (!targetUrl || !amount) {
            return res.status(400).json({ error: 'Missing URL or Amount' });
        }

        console.log(`Mottog beställning: ${amount} besökare till ${targetUrl}`);

        // --- HÄR SKER MAGIN (Integration mot Trafik-leverantör) ---
        
        // I en riktig app skulle du anropa leverantörens API här (t.ex. en SMM panel).
        // Just nu simulerar vi att det lyckades.
        
        /* Exempel på hur koden ser ut när du har en leverantör:
        const response = await axios.post('https://cheap-traffic-provider.com/api/v2', {
            key: process.env.PROVIDER_API_KEY,
            action: 'add',
            service: 123, // ID för deras tjänst
            link: targetUrl,
            quantity: amount
        });
        */

        // Simulera svar (ta bort detta block när du har en riktig leverantör)
        const mockResponse = {
            order_id: Math.floor(Math.random() * 100000),
            status: "success"
        };

        // --- SLUT PÅ MAGI ---

        // Skicka tillbaka svar till frontend
        res.status(200).json({
            message: 'Kampanj startad!',
            orderId: mockResponse.order_id,
            details: { targetUrl, amount, category }
        });

    } catch (error) {
        console.error('Något gick fel:', error);
        res.status(500).json({ error: 'Kunde inte starta kampanjen' });
    }
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
});
