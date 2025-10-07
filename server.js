const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();


const serviceAccount = JSON.parse(process.env.DATABASE_CREDENTIALS);

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

// ----------------- USER SETTINGS -----------------

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

// ----------------- RIDES -----------------
//Offer a ride
app.post('/api/rides', async (req, res) => {
  try {
    const ride = req.body;
    const rideRef = db.ref('rides').push(); // generates a unique rideId
    rideRef.set({ ...ride, status: 'active' });
    res.json({ message: 'Ride offered successfully', rideId: rideRef.key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Get all available rides
app.get('/api/rides', async (req, res) => {
  try {
    const snapshot = await db.ref('rides').once('value');
    const rides = snapshot.val() || {};
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

// Get ride details by ID
app.get('/api/rides/:rideId', async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const snapshot = await db.ref(`rides/${rideId}`).once('value');
    if (!snapshot.exists()) return res.status(404).json({ message: 'Ride not found' });
    res.json(snapshot.val());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------- RIDE REQUESTS -----------------
// Request a seat in a ride
app.post('/api/riderequests', async (req, res) => {
  try {
    const request = req.body; // rideId, requesterId, seatsRequested
    const requestRef = db.ref('rideRequests').push();
    requestRef.set({ ...request, status: 'pending', timestamp: Date.now() });
    res.json({ message: 'Ride request submitted', requestId: requestRef.key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ride requests by user
app.get('/api/riderequests/user/:userId', async (req, res) => {
  try {
    const snapshot = await db.ref('rideRequests')
      .orderByChild('requesterId')
      .equalTo(req.params.userId)
      .once('value');

    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ride requests for a ride (for driver to see)
app.get('/api/riderequests/ride/:rideId', async (req, res) => {
  try {
    const snapshot = await db.ref('rideRequests')
      .orderByChild('rideId')
      .equalTo(req.params.rideId)
      .once('value');

    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
