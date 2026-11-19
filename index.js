import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import Stripe from "stripe";

const port = process.env.PORT || 4000;
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
const applications = db.collection("applications");
const payments = db.collection("payments");
const savedJobs = db.collection("saved-jobs");

app.get("/", (req, res) => {
  res.send("HireLoop Backend is running");
});

app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/users/:id/premium", async(req, res)=> {
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await users.findOne(query, {projection: {premium: 1}})
  res.send(result)
})

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

app.get("/applications", async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.userId = req.query.applicantId;
  }
  const result = await applications.find(query).toArray();
  res.send(result);
});

app.get("/applications/count", async (req, res) => {
  const query = {};
  if (req.query.applicantId) {
    query.userId = req.query.applicantId;
  }
  const result = await applications.countDocuments(query);
  res.send({ count: result });
});

app.post("/applications", async (req, res) => {
  const application = req.body;
  const result = await applications.insertOne(application);
  res.send(result);
});

app.post("/payments/checkout-verify", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.send({ success: false, message: "SessionId id required" });
  }
  const { status, payment_status, customer_email, metadata, payment_intent } =
    await stripe.checkout.sessions.retrieve(sessionId);
  if (status === "complete" && payment_status === "paid") {
    const sessionQuery = {sessionId}
    
    const existingPayment = await payments.findOne(sessionQuery)
    if (existingPayment) {
      return res.send({ success: false, message: "Payment already verified" });
    }

    const payment = {
      sessionId,
      status,
      payment_status,
      customer_email,
      userId: metadata.userId,
      payment_date: new Date(),
      payment_intent,
    };

    const result = await payments.insertOne(payment);
    const query = { _id: new ObjectId(metadata.userId) };
    const updatedDoc = {
      $set: {
        premium: true,
      },
    };
    const updatedResult = await users.updateOne(query, updatedDoc);
    res.send({ success: true, result, updatedResult });
    return;
  }
  res.send({ success: false, message: "Payment verification failed" });
});

app.post("/saved-jobs", async (req, res) => {
  const data = req.body;
  const existing = await savedJobs.findOne({
    jobId: data.jobId,
    userId: data.userId,
  });
  if (existing) {
    return res.status(409).send({ message: "Job already saved" });
  }
  const saveJob = {
    ...data,
    savedAt: new Date(),
  };
  const result = await savedJobs.insertOne(saveJob);
  res.send(result);
});

app.get("/saved-jobs/:email", async (req, res) => {
  const result = await savedJobs
    .find({ userEmail: req.params.email })
    .sort({ savedAt: -1 })
    .toArray();
  res.send(result);
});

app.delete("/saved-jobs/:jobId/:userId", async (req, res) => {
  const { jobId, userId } = req.params;
  const result = await savedJobs.deleteOne({ jobId, userId });
  res.send(result);
});

app.listen(port, () => {
  console.log(`HireLoop is running on port ${port}`);
});
