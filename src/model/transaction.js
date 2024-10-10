import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    qrcode: String,
    rfid: String,
    price: Number,
    totalProduct: Number,
    date: {type: Date, default: Date.now}
})

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction;