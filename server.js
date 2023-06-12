const express = require("express");
const http = require("http");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 1337;

const MONGO_URI =
  "mongodb+srv://jaissy:mander1234@cluster0.43kmgjv.mongodb.net/notes-db?retryWrites=true&w=majority";
const DB_NAME = "notes-db";
let client;

async function start() {
  try {
    client = await MongoClient.connect(MONGO_URI);
    console.log("Connected to database successfully");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }

  app.use(express.json());

  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE"); // Add PUT method
    next();
  });

  app.post("/signup", async (req, res) => {
    const { email, password, username } = req.body;
    const users = await getUsersCollection();
    const result = await users.insertOne({
      email,
      password,
      username,
      notes: [],
    });
    res.send({ result, username });
  });

  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const users = await getUsersCollection();
    const user = await users.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).send({ error: "Invalid email or password" });
    }
    res.send(user);
  });

  app.get("/notes/:userId", async (req, res) => {
    const { userId } = req.params;
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.send(user.notes);
  });

  app.post("/notes/:userId", async (req, res) => {
    const { userId } = req.params;
    const { title, content } = req.body;
    const noteId = new ObjectId();
    const notes = {
      noteId: noteId,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const users = await getUsersCollection();
    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { notes } }
    );
    if (result.modifiedCount !== 1) {
      return res.status(500).send("Failed to add note");
    }
    res.status(200).json({ message: "Success", id: noteId });
  });

  app.put("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;
    const { title, content } = req.body;
    const users = await getUsersCollection();
    const result = await users.updateOne(
      { "notes.noteId": new ObjectId(noteId) },
      {
        $set: {
          "notes.$.title": title,
          "notes.$.content": content,
          "notes.$.updatedAt": new Date(),
        },
      }
    );
    if (result.modifiedCount !== 1) {
      return res.status(500).send("Failed to update note");
    }
    res.status(200).json({ message: "Note updated successfully", id: noteId });
  });

  app.delete("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;
    const users = await getUsersCollection();
    const result = await users.updateOne(
      { "notes.noteId": new ObjectId(noteId) },
      { $pull: { notes: { noteId: new ObjectId(noteId) } } }
    );
    console.log(result);
    if (result.modifiedCount !== 1) {
      return res.status(500).send("Failed to delete note");
    }
    res.status(200).json({ message: "Success" });
  });

  async function getUsersCollection() {
    const db = client.db(DB_NAME);
    return db.collection("users");
  }

  http.createServer(app).listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
