require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Här ställer du in din leverantör (SMM Panel)
// VIKTIGT: Dessa uppgifter får du från leverantörens hemsida
const PROVIDER_URL = 'https://exempel-panel.com/api/v2'; // Byt till din leverantörs API URL
const API_KEY = process.env.TRAFFIC_API_KEY; // Vi lägger nyckeln i Renders inställningar sen

app.get('/', (req, res) => {
    res.send('Traffic Backend is Active & Ready for Real Orders!');
});

app.post('/api/start-campaign', async (req, res) => {
    try {
        const { targetUrl, amount } = req.body;

        if (!targetUrl || !amount) {
            return res.status(400).json({ error: 'Saknar länk eller antal' });
        }

        console.log(`Beställer ${amount} besökare till ${targetUrl}...`);

        // --- SKARPT LÄGE: Skicka order till leverantören ---
        // De flesta SMM-paneler använder exakt detta format:
        const response = await axios.post(PROVIDER_URL, {
            key: API_KEY,
            action: 'add',
            service: 1234, // BYT DETTA till ID:t för den tjänst du vill sälja hos din leverantör
            link: targetUrl,
            quantity: amount
        });

        // Kontrollera om leverantören accepterade ordern
        if (response.data.error) {
            throw new Error(response.data.error);
        }

        console.log('Order lyckades hos leverantör:', response.data);

        res.status(200).json({
            message: 'Kampanj startad på riktigt!',
            providerOrderId: response.data.order,
            details: { targetUrl, amount }
        });

    } catch (error) {
        console.error('Beställning misslyckades:', error.message);
        res.status(500).json({ 
            error: 'Kunde inte starta kampanjen hos leverantören.',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
});
