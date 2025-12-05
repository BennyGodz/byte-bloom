const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Data files
const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const PROGRAMS_FILE = path.join(__dirname, 'data', 'programs.json');

// In-memory storage with persistence
let events = [];
let programs = [];

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load data from files
async function loadData() {
  try {
    await ensureDataDir();
    
    // Load events
    try {
      const eventsData = await fs.readFile(EVENTS_FILE, 'utf8');
      events = JSON.parse(eventsData);
    } catch {
      events = [];
      await saveEvents();
    }
    
    // Load programs
    try {
      const programsData = await fs.readFile(PROGRAMS_FILE, 'utf8');
      programs = JSON.parse(programsData);
    } catch {
      programs = [];
      await savePrograms();
    }
    
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
    events = [];
    programs = [];
  }
}

// Save events to file
async function saveEvents() {
  try {
    await ensureDataDir();
    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error('Error saving events:', error);
  }
}

// Save programs to file
async function savePrograms() {
  try {
    await ensureDataDir();
    await fs.writeFile(PROGRAMS_FILE, JSON.stringify(programs, null, 2));
  } catch (error) {
    console.error('Error saving programs:', error);
  }
}

// Middleware
app.use(express.json());
app.use(express.static("public"));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current data to new client
  socket.emit('events-update', events);
  socket.emit('programs-update', programs);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.get('/api/events', (req, res) => {
  res.json(events);
});

app.get('/api/programs', (req, res) => {
  res.json(programs);
});

app.post('/api/events', async (req, res) => {
  const event = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  events.push(event);
  
  // Save to file
  await saveEvents();
  
  // Broadcast to all clients
  io.emit('events-update', events);
  
  res.json(event);
});

app.delete('/api/events/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  events = events.filter(event => event.id !== id);
  
  // Save to file
  await saveEvents();
  
  // Broadcast to all clients
  io.emit('events-update', events);
  
  res.json({ success: true });
});

app.post('/api/programs', async (req, res) => {
  const program = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  programs.push(program);
  
  // Save to file
  await savePrograms();
  
  // Broadcast to all clients
  io.emit('programs-update', programs);
  
  res.json(program);
});

app.delete('/api/programs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  programs = programs.filter(program => program.id !== id);
  
  // Save to file
  await savePrograms();
  
  // Broadcast to all clients
  io.emit('programs-update', programs);
  
  res.json({ success: true });
});

// Start server and load data
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await loadData();
});