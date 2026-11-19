import { MongoClient } from "mongodb"
import { readFileSync } from "fs"

const env = readFileSync(new URL("./.env", import.meta.url), "utf8")
const url = env.match(/^MONGODB_URL=(.*)$/m)?.[1]?.trim()
const db = "hireloopdb"

const client = new MongoClient(url)
await client.connect()
const database = client.db(db)
const cols = await database.listCollections().toArray()
console.log("collections:", cols.map(c => c.name).join(", "))

// delete temp figma-verify users (any prefix) and their accounts/sessions
const users = database.collection("user")
const accounts = database.collection("account")
const sessions = database.collection("session")
const found = await users.find({ email: /fig\.verify\./ }).toArray()
for (const u of found) {
  await accounts.deleteMany({ userId: u._id })
  await sessions.deleteMany({ userId: u._id })
  await users.deleteOne({ _id: u._id })
  console.log("deleted:", u.email)
}
if (!found.length) console.log("no temp users found")
await client.close()
