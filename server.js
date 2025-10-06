const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();


const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});


const db = admin.database();

const app = express();
app.use(cors());
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.send('Colligo REST API is running with Firebase!');
});

// Helper function to sanitize email for Realtime DB key
const sanitizeEmailKey = (email) => email.replace(/\./g, ',');


// GET user by email
app.get('/api/settings/:email', async (req, res) => {
  try {
    const emailKey = req.params.email.replace('.', ','); // Realtime DB doesn't allow '.' in keys
    const snapshot = await db.ref(`userSettings/${emailKey}`).get();
    if (!snapshot.exists()) return res.status(404).json({ message: 'User not found' });
    res.json(snapshot.val());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST to create/update user
app.post('/api/settings', async (req, res) => {
  try {
    const { name, age, gender, email, number, imageUrl } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailKey = email.replace('.', ','); // Realtime DB doesn't allow '.' in keys
    await db.ref(`userSettings/${emailKey}`).set({ name, age, gender, email, number, imageUrl });
    res.json({ message: 'User settings created/updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
