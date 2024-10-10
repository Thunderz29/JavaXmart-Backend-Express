import { connectDBPostgre } from "../configs/db.js";
import Transaction from "../model/transaction.js";
import redisClient from "../redis/redisClient.js";

const resolvers = {
    getTransaction: async ({ qrcode }) => {
        try {
            console.log('Received qrCode:', qrcode);
            console.log('Type of qrCode:', typeof qrcode);
    
            if (qrcode === undefined || qrcode === null) {
                throw new Error('qrCode is required and cannot be undefined or null');
            }
    
            qrcode = String(qrcode);
    
            let transactionDocuments;
    
            console.log('Attempting to get data from Redis');
            const redisData = await redisClient.get(qrcode);
            console.log('Redis data:', redisData);
    
            if (redisData) {
                console.log('Data found in Redis, parsing...');
                transactionDocuments = JSON.parse(redisData);
            } else {
                console.log('Data not found in Redis, querying MongoDB');
                transactionDocuments = await Transaction.find({ qrcode: qrcode });
                console.log('MongoDB query result:', transactionDocuments);
    
                if (transactionDocuments.length > 0) {
                    console.log('Attempting to set data in Redis');
                    await redisClient.setEx(qrcode, 3600, JSON.stringify(transactionDocuments));
                    console.log('Data set in Redis successfully');
                } else {
                    console.log('No transactions found for this qrCode');
                }
            }
    
            console.log('Mapping transaction documents');
            return transactionDocuments.map(doc => ({
                qrcode: doc.qrcode,
                rfid: doc.rfid,
                price: doc.price,
                totalProduct: doc.totalProduct,
                date: doc.date
            }));
        } catch (error) {
            console.error('Detailed error in getTransaction:', error);
            throw new Error('Failed to fetch transactions: ' + error.message);
        }
    },

    saveTransaction: async ({ qrcode, transaction }) => {
        let client;
        try {

            //Pasrtikan Transaction Array
            if (!Array.isArray(transaction)) {
                throw new TypeError('Transaction must be an array');
            }
            client = await connectDBPostgre();

            // Menghitung harga
            let totalPrice = 0;
            for (const product of transaction) {
                totalPrice += product.price * product.totalProduct;
            }
    
            // Mendapatkan saldo wallet
            const result = await client.query('SELECT wallet FROM customer WHERE qrcode = $1', [qrcode]);
            const user = result.rows[0];
    
            // Cek apakah saldo cukup
            if (!user || user.wallet < totalPrice) {
                throw new Error(`Not enough balance. Your balance is ${user.wallet} and you need ${totalPrice}`);
            }
    
            // Simpan Transaksi ke MongoDB
            const transactionDocuments = transaction.map((product) => ({
                qrcode: qrcode,
                rfid: product.rfid,
                price: product.price,
                totalProduct: product.totalProduct,
                date: new Date()
            }));

            await Transaction.insertMany(transactionDocuments);
            console.log("Transactions saved successfully!");
    
            // Transfer data transaksi dari MongoDB ke PostgreSQL
            await client.query('BEGIN');
            for (const detail of transactionDocuments) {
                await client.query('INSERT INTO transaction (qrcode, rfid, price, total_Product, date) VALUES ($1, $2, $3, $4, $5)', [
                    detail.qrcode,
                    detail.rfid,
                    detail.price,
                    detail.totalProduct,
                    detail.date
                ]);
            }
            await client.query('COMMIT');

            // Mengurangi saldo wallet pengguna
            await client.query('UPDATE customer SET wallet = wallet - $1 WHERE qrcode = $2', [totalPrice, qrcode]);
            await redisClient.del(qrcode);

            return { success: true, message: "Transaction berhasil diselesaikan" };
        } catch (error) {
            console.error('Error in saveTransaction:', error);
            if (client) {
                await client.query('ROLLBACK').catch(rollbackError => {
                    console.error('Error during rollback:', rollbackError);
                });
            }
            await transaction.deleteMany({qrcode});
            await redisClient.del(qrcode);
            throw new Error("Failed to complete transaction: " + error.message);
        } finally {
        }
    }
};

export default resolvers;