import { buildSchema } from "graphql";

const schema = buildSchema(`
    scalar Date
    
    type Transaction {
        qrcode: String!
        rfid: String!
        price: Float!
        totalProduct: Int!
        date: Date!
    }
    
    input TransactionInput {
        rfid: String!
        productName: String!
        price: Int!
        totalProduct: Int!
    }

    type CompleteTransactionResponse {
      success: Boolean!
      message: String!
    }
    
    type Query {
        getTransaction(qrcode: String!): [Transaction!]!
    }
    
    type Mutation {
        saveTransaction(qrcode: String!, transaction: [TransactionInput!]!): CompleteTransactionResponse!
    }
`);

export default schema