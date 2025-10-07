
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

// Helper: basic validation for a post
function validatePostPayload(body) {
  if (!body || typeof body !== 'object') return 'Invalid request body';
  const { title, description, category } = body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) return 'title is required and must be a non-empty string';
  if (!description || typeof description !== 'string') return 'description is required and must be a string';
  if (!category || typeof category !== 'string') return 'category is required and must be a string';
  return null;
}

function sanitizePostInput(body) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    imageUri: body.imageUri ? String(body.imageUri) : null,
    location: body.location ? String(body.location) : null,
    status: body.status ? String(body.status) : null,
    timestamp: body.timestamp ? Number(body.timestamp) : Date.now()
  };
}

const POSTS_NODE = 'posts';

// GET /api/posts?limit=50  -> returns newest-first
app.get('/api/posts', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '100', 10)));
    const snap = await db.ref(POSTS_NODE).orderByChild('timestamp').limitToLast(limit).once('value');
    const data = snap.val() || {};
    const list = Object.keys(data)
      .map(key => ({ id: key, ...data[key] }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'failed_to_fetch_posts', message: err.message });
  }
});

// GET /api/posts/:id
app.get('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snap = await db.ref(`${POSTS_NODE}/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'not_found' });
    res.json({ id, ...snap.val() });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_fetch_post', message: err.message });
  }
});

// POST /api/posts  -> create
app.post('/api/posts',async (req, res) => {
  try {
    const validationError = validatePostPayload(req.body);
    if (validationError) return res.status(400).json({ error: 'invalid_input', message: validationError });

    const payload = sanitizePostInput(req.body);
    const newRef = await db.ref(POSTS_NODE).push(payload);
    res.status(201).json({ id: newRef.key, ...payload });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_create_post', message: err.message });
  }
});

// PUT /api/posts/:id  -> partial update
app.put('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snap = await db.ref(`${POSTS_NODE}/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'not_found' });

    const allowed = ['title', 'description', 'category', 'imageUri', 'location', 'status', 'timestamp'];
    const updates = {};
    for (const k of allowed) {
      if (k in req.body) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'invalid_input', message: 'No valid fields to update' });

    await db.ref(`${POSTS_NODE}/${id}`).update(updates);
    const updated = await db.ref(`${POSTS_NODE}/${id}`).once('value');
    res.json({ id, ...updated.val() });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_update_post', message: err.message });
  }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const snap = await db.ref(`${POSTS_NODE}/${id}`).once('value');
    if (!snap.exists()) return res.status(404).json({ error: 'not_found' });
    await db.ref(`${POSTS_NODE}/${id}`).remove();
    res.json({ id, deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'failed_to_delete_post', message: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
