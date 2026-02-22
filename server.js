const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 Replace with PhonePe credentials
const MERCHANT_ID = "YOUR_MERCHANT_ID";
const SALT_KEY = "YOUR_SALT_KEY";
const SALT_INDEX = 1;

const BASE_URL = "https://api.phonepe.com/apis/hermes";
const CALLBACK_URL = "http://localhost:5000/payment-status";

// ==============================
// Create Payment Order
// ==============================
app.post("/create-order", async (req, res) => {
  try {
    const { amount, name, mobile } = req.body;
    const transactionId = "TXN" + Date.now();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: mobile,
      amount: amount * 100,
      redirectUrl: CALLBACK_URL,
      redirectMode: "POST",
      mobileNumber: mobile,
      paymentInstrument: { type: "PAY_PAGE" }
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");

    const checksum =
      crypto.createHash("sha256")
      .update(payloadBase64 + "/pg/v1/pay" + SALT_KEY)
      .digest("hex") + "###" + SALT_INDEX;

    const response = await axios.post(
      `${BASE_URL}/pg/v1/pay`,
      { request: payloadBase64 },
      { headers: { "X-VERIFY": checksum } }
    );

    res.json({
      success: true,
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
      transactionId
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false });
  }
});

// ==============================
// Check Payment Status
// ==============================
app.get("/check-status/:txnId", async (req, res) => {
  try {
    const txnId = req.params.txnId;

    const checksum =
      crypto.createHash("sha256")
      .update(`/pg/v1/status/${MERCHANT_ID}/${txnId}` + SALT_KEY)
      .digest("hex") + "###" + SALT_INDEX;

    const response = await axios.get(
      `${BASE_URL}/pg/v1/status/${MERCHANT_ID}/${txnId}`,
      { headers: { "X-VERIFY": checksum } }
    );

    res.json(response.data);

  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));