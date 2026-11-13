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
const applications = db.collection("applications")

app.get("/", (req, res) => {
  res.send("HireLoop Backend is running");
});

app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/jobs", async (req, res) => {
  const query = {};
  // console.log("query", req.query);
  if (req.query) {
    if (req.query.jobType) {
      query.jobType = req.query.jobType;
    }
    if (req.query.isRemote) {
      query.isRemote = req.query.isRemote === "true";
    }
    if (req.query.salaryFrequency) {
      query.salaryFrequency = req.query.salaryFrequency;
    }
    if (req.query.jobCategory) {
      query.jobCategory = req.query.jobCategory;
    }
    // Search title, description, and requirements
    if (req.query.search) {
      query.$or = [
        { jobTitle: { $regex: req.query.search, $options: "i" } },
        { responsibilities: { $regex: req.query.search, $options: "i" } },
        { qualifications: { $regex: req.query.search, $options: "i" } },
      ];
    }
  }
  const cursor = jobs.find(query);
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


app.get("/applications/:email", async(req, res) => {
  const email = req.params.email
  const query = {userEmail: email}
  const result = await applications.find(query).toArray()
  res.send(result)
})

app.post("/applications", async(req, res) => {
  const application = req.body;
  const result = await applications.insertOne(application)
  res.send(result)
})

app.listen(port, () => {
  console.log(`HireLoop is running on port ${port}`);
});
