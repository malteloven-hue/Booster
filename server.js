require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// SMMKings API-URL
const PROVIDER_URL = 'https://smmkings.com/api/v2'; 

// Din hemliga nyckel (som du la in i Render under "Environment Variables")
const API_KEY = process.env.TRAFFIC_API_KEY; 

app.get('/', (req, res) => {
    res.send('Traffic Backend is Active & Ready for SMMKings!');
});

app.post('/api/start-campaign', async (req, res) => {
    try {
        const { targetUrl, amount } = req.body;

        // Enkel kontroll att vi har fått data
        if (!targetUrl || !amount) {
            return res.status(400).json({ error: 'Saknar länk eller antal' });
        }

        console.log(`Beställer ${amount} besökare (Service ID 1146) till ${targetUrl}...`);

        // --- SKARPT LÄGE: Skickar order till SMMKings ---
        const response = await axios.post(PROVIDER_URL, {
            key: API_KEY,
            action: 'add',
            service: 1146,  // <--- Här är ditt valda ID inlagt!
            link: targetUrl,
            quantity: amount
        });

        // Kontrollera om SMMKings svarade med ett fel
        if (response.data.error) {
            throw new Error(response.data.error);
        }

        console.log('Order lyckades hos SMMKings:', response.data);

        // Skicka tillbaka OK till din frontend
        res.status(200).json({
            message: 'Kampanj startad!',
            providerOrderId: response.data.order,
            details: { targetUrl, amount, serviceId: 1146 }
        });

    } catch (error) {
        console.error('Beställning misslyckades:', error.message);
        // Om SMMKings skickade med detaljerat fel, visa det, annars generellt fel
        const errorMessage = error.response?.data?.error || error.message;
        
        res.status(500).json({ 
            error: 'Kunde inte starta kampanjen hos SMMKings.',
            details: errorMessage 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
});
