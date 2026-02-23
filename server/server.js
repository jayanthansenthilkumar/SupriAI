const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const db = require('./database.js');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Tabs endpoints
app.post('/api/tabs', (req, res) => {
    const { url, title, domain, duration, is_active } = req.body;
    db.run(
        `INSERT INTO tabs (url, title, domain, duration, is_active) VALUES (?, ?, ?, ?, ?)`,
        [url, title, domain, duration, is_active],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/tabs', (req, res) => {
    db.all(`SELECT * FROM tabs ORDER BY visit_time DESC LIMIT 10`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/stats', (req, res) => {
    db.all(
        `SELECT COUNT(*) as total_tabs, COUNT(DISTINCT domain) as unique_domains FROM tabs`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows[0]);
        }
    );
});

// Trigger Python AI Agent
app.post('/api/agents/analyze', (req, res) => {
    // Calling python script for agent analysis
    const pythonProcess = spawn('python', ['../agents/analyzer.py']);
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('Python Error:', errorString);
            return res.status(500).json({ error: 'Agent execution failed', details: errorString });
        }
        try {
            const result = JSON.parse(dataString);
            // Save insight to DB
            db.run(
                `INSERT INTO insights (model_name, insight_type, data) VALUES (?, ?, ?)`,
                ['AI Agent', 'browsing_analysis', JSON.stringify(result)],
                (err) => {
                    if (err) console.error(err);
                }
            );
            res.json(result);
        } catch (e) {
            res.status(500).json({ error: 'Invalid response from agent' });
        }
    });
});

// Settings endpoints
app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    db.run(
        `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, value],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
