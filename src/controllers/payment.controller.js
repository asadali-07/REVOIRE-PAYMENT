import Razorpay from "razorpay";
import Payment from "../models/payment.model.js";
import { validatePaymentVerification } from "../../node_modules/razorpay/dist/utils/razorpay-utils.js";
import dotenv from 'dotenv';
import axios from "axios";
import { publishToQueue } from "../broker/broker.js";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createPayment = async (req, res) => {
  const { orderId } = req.params;
  const token = req.cookies.token || req.headers.authorization.split(" ")[1];

  try {
    const orderResponse = await axios.get(`https://revoire-order.onrender.com/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const price={
      amount: orderResponse.data.order.totalPrice.amount * 100,
      currency: orderResponse.data.order.totalPrice.currency
    }

    const order = await razorpay.orders.create({amount: price.amount, currency: price.currency});

    const newPayment = await Payment.create({
      order: orderResponse.data.order._id,
      user: req.user.id,
      razorpayOrderId: order.id,
      price: orderResponse.data.order.totalPrice,
      status: "PENDING",
    });
    await Promise.all([
      publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_CREATED", newPayment),
      publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", {
      orderId: orderResponse.data.order._id,
      username: req.user.username,
      currency: orderResponse.data.order.totalPrice.currency,
      amount: orderResponse.data.order.totalPrice.amount,
      email: req.user.email,
      })
    ]);

    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpay_key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  try {
    const isValid = validatePaymentVerification(
      { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
      signature,
      secret
    );

    if (isValid) {
      const payment = await Payment.findOne({ razorpayOrderId, status: "PENDING" });

      if (!payment) return res.status(404).send("Payment not found");
      if (payment.user.toString() !== req.user.id) return res.status(403).send("You are not authorized to verify this payment");

    await Promise.all([
        publishToQueue("PAYMENT_SELLER_DASHBOARD.PAYMENT_UPDATE", payment),
        publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", {
          orderId: payment.order,
          username: req.user.username,
          currency: payment.price.currency,
          amount: payment.price.amount,
          email: req.user.email,
        }),
      ]);

      payment.razorpayPaymentId = razorpayPaymentId;
      payment.signature = signature;
      payment.status = "COMPLETED";
      await payment.save();

      res.json({ status: "success", message: "Payment verified successfully" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    await publishToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", {
      username: req.user.username,
      orderId: razorpayOrderId,
      email: req.user.email,
    });
    res.status(400).send({ status: "failure", message: "Invalid signature" });
  }
};


export const getPaymentByOrderId = async (req,res) => {
  const { orderId } = req.params;
  try {
    const payment = await Payment.findOne({ order: orderId });
    if (!payment) return res.status(404).send("Payment not found");
    res.json({message: "Payment fetched successfully", payment});
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).send("Internal Server Error");
  }
};
