const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require('cors');


const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "your_super_secret_key_123!"; // Use env var in prod

// Middleware
app.use(cors({
  origin: "http://127.0.0.1:5500",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/cognifyz_task6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB error:", err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});
const User = mongoose.model("User", userSchema);

// Note Schema and Model
const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
const Note = mongoose.model("Note", noteSchema);

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.warn("🚫 Invalid token:", err.message);
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}


// Register User
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: "Username and password (min 6 characters) required" });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(409).json({ message: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = new User({ username, passwordHash });
  await newUser.save();

  res.status(201).json({ message: "User registered successfully" });
});

// Login User
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, userId: user._id, username: user.username });
});

// Create Note
app.post("/api/notes", authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Title and content required" });
  }

  try {
    const note = new Note({ title, content, userId: req.user.id });
    await note.save();
    res.status(201).json({ message: "Note created", note });
  } catch (err) {
    console.error("❌ Note creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Notes
app.get("/api/notes", authenticateToken, async (req, res) => {
  console.log("✅ Token authenticated for user:", req.user);
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ notes });
  } catch (err) {
    console.error("❌ Fetching notes error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Optional: Get Single Note
app.get("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ note });
  } catch (err) {
    console.error("❌ Fetch single note error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Optional: Update Note
app.put("/api/notes/:id", authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  try {
    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, content },
      { new: true }
    );
    if (!updatedNote) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note updated", note: updatedNote });
  } catch (err) {
    console.error("❌ Update note error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Optional: Delete Note
app.delete("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const deletedNote = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deletedNote) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("❌ Delete note error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
