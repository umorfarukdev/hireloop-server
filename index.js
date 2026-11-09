import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const port = process.env.PORT || 4000;
const app = express();

app.use(express.json());
app.use(cors());

const client = new MongoClient(process.env.MONGODB_URL);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("hireloopdb");
const users = db.collection("user");
const jobs = db.collection("jobs");

app.get("/", (req, res) => {
  res.send("HireLoop Backend is running");
});

app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobs", async (req, res) => {
  const cursor = jobs.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobs.findOne(query);
  res.send(result);
});

app.post("/jobs", async (req, res) => {
  const newJobs = req.body;
  const result = await jobs.insertOne(newJobs);
  res.send(result);
});

app.delete("/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await jobs.deleteOne(query);
  res.send(result);
});

app.listen(port, () => {
  console.log(`HireLoop is running on port ${port}`);
});
