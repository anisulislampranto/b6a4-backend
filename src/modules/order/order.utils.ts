import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createStripeSession = async (paymentData: {
    transactionId: string;
    totalPrice: number;
    customerEmail: string;
    customerName: string;
}) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Medicine Order',
                    },
                    unit_amount: Math.round(paymentData.totalPrice * 100),
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/orders?status=success&transactionId=${paymentData.transactionId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/checkout?status=cancel`,
        customer_email: paymentData.customerEmail,
        metadata: {
            transactionId: paymentData.transactionId,
        },
    });

    return session;
};

export const verifyStripePayment = async (sessionId: string) => {
    return await stripe.checkout.sessions.retrieve(sessionId);
};
