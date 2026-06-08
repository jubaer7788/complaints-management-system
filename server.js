const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('complaints.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    priority TEXT NOT NULL DEFAULT 'Medium',
    complainant_name TEXT NOT NULL,
    complainant_email TEXT NOT NULL,
    complainant_phone TEXT,
    assigned_to TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get('/api/complaints', (req, res) => {
  try {
    const { status } = req.query;
    let complaints;
    if (status) {
      complaints = db.prepare('SELECT * FROM complaints WHERE status = ? ORDER BY created_at DESC').all(status);
    } else {
      complaints = db.prepare('SELECT * FROM complaints ORDER BY created_at DESC').all();
    }
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/complaints/:id', (req, res) => {
  try {
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', (req, res) => {
  try {
    const { title, category, description, complainant_name, complainant_email, complainant_phone } = req.body;
    if (!title || !category || !description || !complainant_name || !complainant_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = db.prepare(
      'INSERT INTO complaints (title, category, description, complainant_name, complainant_email, complainant_phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, category, description, complainant_name, complainant_email, complainant_phone || null);
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/complaints/:id', (req, res) => {
  try {
    const { status, priority, assigned_to, remarks } = req.body;
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    db.prepare(
      'UPDATE complaints SET status = COALESCE(?, status), priority = COALESCE(?, priority), assigned_to = COALESCE(?, assigned_to), remarks = COALESCE(?, remarks), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status || null, priority || null, assigned_to || null, remarks || null, req.params.id);

    const updated = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/complaints/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Complaint deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM complaints').get();
    const open = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Open'").get();
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get();
    const resolved = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get();
    const closed = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Closed'").get();
    res.json({ total: total.count, open: open.count, inProgress: inProgress.count, resolved: resolved.count, closed: closed.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Complaints Management System running on http://localhost:${PORT}`);
});
