// One-off: remove the stray job document with an empty _id ("")
// which blocks deletion from the UI (DELETE /jobs/ -> 404).
import { MongoClient } from "mongodb"

const url = process.env.MONGODB_URL
if (!url) throw new Error("MONGODB_URL not set")

const client = new MongoClient(url)
await client.connect()
const jobs = client.db("hireloopdb").collection("jobs")

const stray = await jobs.find({ _id: "" }).toArray()
console.log("stray docs found:", stray.length, stray.map((d) => d.jobTitle))

if (stray.length) {
  const res = await jobs.deleteMany({ _id: "" })
  console.log("deleted:", res.deletedCount)
}

const count = await jobs.countDocuments()
console.log("jobs remaining:", count)
await client.close()
