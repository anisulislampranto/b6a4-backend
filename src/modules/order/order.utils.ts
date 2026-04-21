export const initiatePayment = async (paymentData: any) => {
    try {
        const response = await fetch(process.env.PAYMENT_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                store_id: process.env.STORE_ID!,
                store_passwd: process.env.STORE_PASS!,
                total_amount: paymentData.totalPrice.toString(),
                currency: "BDT",
                tran_id: paymentData.transactionId,
                success_url: `${process.env.BACKEND_URL}/api/orders/confirmation?transactionId=${paymentData.transactionId}&status=success`,
                fail_url: `${process.env.BACKEND_URL}/api/orders/confirmation?transactionId=${paymentData.transactionId}&status=fail`,
                cancel_url: `${process.env.APP_URL}/`,
                ipn_url: `${process.env.BACKEND_URL}/api/orders/confirmation?transactionId=${paymentData.transactionId}&status=ipn`,
                cus_name: paymentData.customerName,
                cus_email: paymentData.customerEmail,
                cus_add1: paymentData.customerAddress,
                cus_phone: paymentData.customerPhone || "01700000000",
                cus_city: "Dhaka",
                cus_country: "Bangladesh",
                ship_name: paymentData.customerName,
                ship_add1: paymentData.customerAddress,
                ship_city: "Dhaka",
                ship_country: "Bangladesh",
                ship_postcode: "1000",
                product_name: "Medicine",
                product_category: "Healthcare",
                product_profile: "general",
            }).toString(),
        });

        const data = await response.json();
        return data;
    } catch (err) {
        throw new Error("SSLCommerz Payment initiation failed!");
    }
};

export const verifyPayment = async (valId: string) => {
    try {
        const response = await fetch(
            `https://sandbox.sslcommerz.com/validator/api/validationserverphp.php?val_id=${valId}&store_id=${process.env.STORE_ID}&store_passwd=${process.env.STORE_PASS}&format=json`,
            {
                method: "GET",
            }
        );

        return await response.json();
    } catch (err) {
        throw new Error("SSLCommerz Payment verification failed!");
    }
};
