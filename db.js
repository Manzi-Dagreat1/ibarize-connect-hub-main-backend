// const mongoose = require('mongoose');

// // It's a best practice to use an environment variable for your URI
// // const mongoURI = 'mongodb+srv://manzinshuti_db_user:Manzi5002.@cluster0.5m6p1y7.mongodb.net/ibarize-connect-hub';
// const mongoURI = 'mongodb+srv://manzinshuti_db_user:Manzi5002.@cluster0.5m6p1y7.mongodb.net/ibarize-connect-hub?retryWrites=true&w=majority&appName=Cluster0';

// const connectDB = async () => {
//   try {
//     await mongoose.connect(mongoURI);
//     console.log('MongoDB connected successfully!');
//   } catch (err) {
//     console.error('MongoDB connection failed:', err.message);
//     // Exit process with failure
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://manzinshutiigor_db_user:p31edgG6eV6fBgiE@ibarize.nep9l04.mongodb.net/ibarize_connect_hub?retryWrites=true&w=majority&appName=ibarize";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
