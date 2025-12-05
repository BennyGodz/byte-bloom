const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs").promises;
const path = require("path");
const simpleGit = require('simple-git');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 8080;
const git = simpleGit();

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

// Auto-commit and push changes (server-side only)
async function autoCommitAndPush(message) {
  try {
    console.log('Committing and pushing changes...');
    
    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log('Not in a git repository, skipping auto-commit');
      return;
    }
    
    // Check if remote exists
    try {
      await git.getRemotes(true);
    } catch {
      console.log('No remote configured, skipping auto-push');
      return;
    }
    
    // Add all changes
    await git.add('.');
    
    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length === 0) {
      console.log('No changes to commit');
      return;
    }
    
    // Commit with message
    await git.commit(message);
    
    // Push to remote (with error handling for no remote or auth issues)
    try {
      await git.push();
      console.log('Changes committed and pushed successfully');
    } catch (pushError) {
      console.log('Changes committed, but push failed:', pushError.message);
      console.log('This is normal if git credentials are not configured');
    }
  } catch (error) {
    console.error('Error in auto-commit and push:', error.message);
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
  
  // Handle admin status notifications
  socket.on('admin-action', (data) => {
    console.log('Admin action:', data);
    // Broadcast to all other clients except sender
    socket.broadcast.emit('admin-notification', {
      type: data.type,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
  
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
  
  // Auto-commit and push
  await autoCommitAndPush(`Add event: ${event.title || 'New event'}`);
  
  // Broadcast to all clients
  io.emit('events-update', events);
  
  res.json(event);
});

app.delete('/api/events/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const deletedEvent = events.find(event => event.id === id);
  events = events.filter(event => event.id !== id);
  
  // Save to file
  await saveEvents();
  
  // Auto-commit and push
  await autoCommitAndPush(`Delete event: ${deletedEvent?.title || 'Event'}`);
  
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
  
  // Auto-commit and push
  await autoCommitAndPush(`Add program: ${program.title || 'New program'}`);
  
  // Broadcast to all clients
  io.emit('programs-update', programs);
  
  res.json(program);
});

app.delete('/api/programs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const deletedProgram = programs.find(program => program.id === id);
  programs = programs.filter(program => program.id !== id);
  
  // Save to file
  await savePrograms();
  
  // Auto-commit and push
  await autoCommitAndPush(`Delete program: ${deletedProgram?.title || 'Program'}`);
  
  // Broadcast to all clients
  io.emit('programs-update', programs);
  
  res.json({ success: true });
});

// Start server and load data
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await loadData();
});