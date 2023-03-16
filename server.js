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
    next();
  });

  app.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    const users = await getUsersCollection();
    const result = await users.insertOne({ email, password, notes: [] });
    res.send(result);
  });

  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const users = await getUsersCollection();
    const user = await users.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).send("Invalid email or password");
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
    const notes = {
      noteId: new ObjectId(),
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
    res.send("Note added successfully");
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
    res.send("Note updated successfully");
  });

  app.delete("/notes/:noteId", async (req, res) => {
    const { noteId } = req.params;
    const users = await getUsersCollection();
    const result = await users.updateOne(
      { "notes.noteId": new ObjectId(noteId) },
      { $pull: { notes: { noteId: ObjectId(noteId) } } }
    );
    if (result.modifiedCount !== 1) {
      return res.status(500).send("Failed to delete note");
    }
    res.send("Note deleted successfully");
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
