import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    razorpayOrderId: {
        type: String,
        required: true,
    },
    razorpayPaymentId: {
        type: String,
    },
    signature: {
        type: String,
    },
    price: {
        amount: { type: Number, required: true },
        currency: { type: String, required: true, default: 'INR', enum: ['INR', 'USD'] },
    },
    status: {
        type: String,
        default: 'PENDING',
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
    },
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;