const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});


const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.send('Colligo REST API is running with Firebase!');
});

// Get user settings by email
app.get('/api/settings/:email', async (req, res) => {
  try {
    const docRef = db.collection('userSettings').doc(req.params.email);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'User not found' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update user settings
app.post('/api/settings', async (req, res) => {
  try {
    const { name, age, gender, email, phone } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    await db.collection('userSettings').doc(email).set({ name, age, gender, email, phone });
    res.json({ message: 'User settings created/updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
