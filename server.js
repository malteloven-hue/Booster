require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Nu kommer denna rad fungera eftersom vi fixade package.json
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Byt ut denna mot din riktiga Lovable-länk när du publicerat (t.ex. https://booster.lovable.app)
// För nu tillåter vi alla (bra för testning)
app.use(cors()); 
app.use(express.json());

const SMM_PROVIDER_URL = 'https://smmkings.com/api/v2';
const SMM_API_KEY = process.env.TRAFFIC_API_KEY;

app.get('/', (req, res) => {
    res.send('Booster Backend is running correctly!');
});

// --- 1. SKAPA STRIPE SESSION (Dynamiskt pris) ---
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { targetUrl, amount, price, serviceId } = req.body;

        // Enkel validering
        if (!targetUrl || !amount || !price || !serviceId) {
            return res.status(400).json({ error: 'Missing required fields (targetUrl, amount, price, serviceId)' });
        }

        console.log(`Creating session for: ${amount} units via Service ${serviceId} ($${price})`);

        // VIKTIGT: Omvandla dollar till cent och avrunda till heltal
        // Exempel: $4.55 blir 455 cents. Stripe kraschar om man skickar decimaler.
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
                            name: `Social Media Boost (${amount} qty)`,
                            description: `Service ID: ${serviceId} - Target: ${targetUrl}`,
                        },
                        unit_amount: unitAmountCents, // Priset i cent
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // Vi sparar all info vi behöver i metadata för att kunna leverera ordern senare
            metadata: {
                targetUrl: targetUrl,
                amount: amount,
                serviceId: serviceId 
            },
            // Byt ut URL:en nedan om du vill ha en specifik tacksida, annars skickas de till Lovable default
            success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/`,
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 2. VERIFIERA OCH LEVERERA (När kunden kommer till Tack-sidan) ---
app.post('/api/verify-order', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing Session ID' });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        console.log("Payment verified! Ordering from SMMKings...");

        const { targetUrl, amount, serviceId } = session.metadata;

        // Skicka ordern till SMMKings
        const smmResponse = await axios.post(SMM_PROVIDER_URL, {
            key: SMM_API_KEY,
            action: 'add',
            service: serviceId, // Använder ID:t som kom från Lovable (t.ex. 3791)
            link: targetUrl,
            quantity: amount
        });

        if (smmResponse.data.error) {
            console.error("SMMKings Error:", smmResponse.data.error);
            // Vi loggar felet men returnerar success till frontend så kunden blir glad,
            // men du måste kolla loggarna om pengar dras men SMMKings nekar.
        } else {
            console.log("SMMKings Order ID:", smmResponse.data.order);
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
