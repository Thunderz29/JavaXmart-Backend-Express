import cors from "cors";
import express from "express";
import { graphqlHTTP } from "express-graphql";
import { connectDBMongo } from "./configs/db.js";
import resolvers from "./graphql/resolver.js";
import schema from "./graphql/schema.js";

const app = express();

async function startServer() {
    try {
        await connectDBMongo()

        app.use(cors());

        app.use('/graphql', graphqlHTTP({
            schema: schema,
            rootValue: resolvers,
            graphiql: true
        }))

        const PORT = process.env.PORT || 800
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.log('Failed to start server', error)
    }
}

await startServer(); 