require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Byt ut mot din frontend-URL (viktigt för Stripe redirect)
const FRONTEND_URL = 'https://lovable.app'; // Eller din publicerade URL

app.use(cors());
app.use(express.json());

const SMM_PROVIDER_URL = 'https://smmkings.com/api/v2';
const SMM_API_KEY = process.env.TRAFFIC_API_KEY;

// --- 1. SKAPA STRIPE SESSION (Dynamiskt pris) ---
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { targetUrl, amount, price, serviceId } = req.body;

        if (!targetUrl || !amount || !price || !serviceId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // VIKTIGT: Omvandla dollar till cent och avrunda till heltal
        // Exempel: $4.55 blir 455 cents. Stripe klarar inte decimaler här.
        const unitAmountCents = Math.round(price * 100);

        // Säkerhetsspärr: Stripe kräver oftast minst ca $0.50 (50 cent)
        if (unitAmountCents < 50) {
             return res.status(400).json({ error: 'Minimum order value is $0.50' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${amount} TikTok Interactions`, // Generiskt namn
                            description: `Service ID: ${serviceId} - Target: ${targetUrl}`,
                        },
                        unit_amount: unitAmountCents, // Här skickar vi det beräknade priset
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            metadata: {
                targetUrl: targetUrl,
                amount: amount,
                serviceId: serviceId 
            },
            success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/`,
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 2. VERIFIERA OCH LEVERERA ---
app.post('/api/verify-order', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        console.log("Payment verified! Ordering from SMMKings...");

        const { targetUrl, amount, serviceId } = session.metadata;

        // Beställning till SMMKings
        const smmResponse = await axios.post(SMM_PROVIDER_URL, {
            key: SMM_API_KEY,
            action: 'add',
            service: serviceId, // Nu används ID:t som kom från Lovable (t.ex. 3791)
            link: targetUrl,
            quantity: amount
        });

        if (smmResponse.data.error) {
            console.error("SMMKings Error:", smmResponse.data.error);
        }

        res.json({ status: 'success', smmOrder: smmResponse.data });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
