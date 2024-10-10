import dotenv from 'dotenv';
import redis from 'redis';

dotenv.config();

const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    db: 0
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    } catch (err) {
        console.error('Error connecting to Redis:', err);
        process.exit(1);
    }
};

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

connectRedis();

export default redisClient;
