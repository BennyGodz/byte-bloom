/* ByteBloom client script
   Handles authentication, events, programs, and admin UI interactions.
 */

const AUTH_KEY = 'bytebloom_auth';
const PASSWORD_KEY = 'bytebloom_saved_password';
const USERNAME_KEY = 'bytebloom_saved_username';
const API_BASE = '/api';
const PROGRAMS_KEY = 'bytebloom_programs';

// Simple encryption/decryption functions
function encrypt(text) {
  return btoa(text.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) + (i + 1) * 3)
  ).join(''));
}

function decrypt(encryptedText) {
  try {
    return atob(encryptedText).split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) - (i + 1) * 3)
    ).join('');
  } catch {
    return '';
  }
}

// Admin credentials (encrypted)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_ENCRYPTED = 'ZX99cXF+hIeIZWl3';

// WebSocket connection
let socket = null;

// Initialize WebSocket connection
function initWebSocket() {
  socket = io();
  
  socket.on('events-update', (data) => {
    console.log('Events updated:', data);
    if (typeof updateEventsList === 'function') {
      updateEventsList(data);
    }
    if (typeof updatePublicEvents === 'function') {
      updatePublicEvents(data);
    }
  });
  
  socket.on('programs-update', (data) => {
    console.log('Programs updated:', data);
    if (typeof updateProgramsList === 'function') {
      updateProgramsList(data);
    }
    if (typeof updatePublicPrograms === 'function') {
      updatePublicPrograms(data);
    }
  });
}

/* ---------------- API Helper ---------------- */
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/* ---------------- Authentication ---------------- */
function checkCredentials(username, password) {
  const decryptedPassword = decrypt(ADMIN_PASSWORD_ENCRYPTED);
  return username === ADMIN_USERNAME && password === decryptedPassword;
}

function isAuthenticated() {
  const auth = localStorage.getItem(AUTH_KEY);
  const token = localStorage.getItem('admin_token');
  return auth === 'true' && token === 'admin-authenticated';
}

function setAuthenticated(status) {
  if (status) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem('admin_token', 'admin-authenticated');
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('admin_token');
  }
}

/* ---------------- Login Form ---------------- */
function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) {
    console.log('Login form not found');
    return;
  }

  console.log('Setting up login form listener');
  
  // Remove any existing listeners
  loginForm.removeEventListener('submit', handleLogin);
  
  // Add new listener
  loginForm.addEventListener('submit', handleLogin);
  
  // Also handle button click directly
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogin(e);
    });
  }
}

function handleLogin(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log('Login form submitted - preventing default');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const rememberPassword = document.getElementById('rememberPassword').checked;

  console.log('Login attempt:', { username, password: '***', hasPassword: !!password });

  if (checkCredentials(username, password)) {
    console.log('Credentials valid, setting authentication');
    setAuthenticated(true);
    updateLoginLayout();

    if (rememberPassword) {
      localStorage.setItem(USERNAME_KEY, username);
      localStorage.setItem(PASSWORD_KEY, password);
    } else {
      localStorage.removeItem(USERNAME_KEY);
      localStorage.removeItem(PASSWORD_KEY);
    }

    showMessage('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      console.log('Redirecting to admin.html');
      window.location.href = 'admin.html';
    }, 400);
    return;
  }

  console.log('Invalid credentials');
  showMessage('Invalid username or password. Please try again.', 'error');
}

/* ---------------- Load saved credentials ---------------- */
function loadSavedPassword() {
  const savedPassword = localStorage.getItem(PASSWORD_KEY);
  const savedUsername = localStorage.getItem(USERNAME_KEY);
  const passwordInput = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const rememberCheckbox = document.getElementById('rememberPassword');

  if (savedPassword && passwordInput) {
    passwordInput.value = savedPassword;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  if (savedUsername && usernameInput) {
    usernameInput.value = savedUsername;
  }
}

/* ---------------- Logout ---------------- */
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    setAuthenticated(false);
    showMessage('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  });
}

/* ---------------- General Helpers ---------------- */
function showMessage(message, type = 'info') {
  const existing = document.querySelector('.message-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `message-toast message-toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  setTimeout(() => {
    el.classList.add('message-toast-hiding');
    setTimeout(() => el.remove(), 300);
  }, 5000);
}

/* ---------------- Event Management ---------------- */
function setupEventForm() {
  const form = document.getElementById('addEventForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const eventData = {
      title: document.getElementById('eventTitle').value,
      date: document.getElementById('eventDate').value,
      time: document.getElementById('eventTime').value,
      description: document.getElementById('eventDescription').value
    };

    try {
      const response = await apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });
      
      showMessage('Event added successfully!', 'success');
      form.reset();
    } catch (error) {
      showMessage('Failed to add event: ' + error.message, 'error');
    }
  });
}

function updateEventsList(events) {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;

  if (events.length === 0) {
    eventsList.innerHTML = '<p class="no-events">No events scheduled yet.</p>';
    return;
  }

  eventsList.innerHTML = events.map(event => `
    <div class="event-item" data-id="${event.id}">
      <div class="event-header">
        <h4>${event.title}</h4>
        <button class="btn-delete" onclick="deleteEvent(${event.id})">×</button>
      </div>
      <div class="event-details">
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Time:</strong> ${event.time}</p>
        <p><strong>Description:</strong> ${event.description}</p>
      </div>
    </div>
  `).join('');
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;

  try {
    await apiRequest(`/events/${id}`, { method: 'DELETE' });
    showMessage('Event deleted successfully!', 'success');
  } catch (error) {
    showMessage('Failed to delete event: ' + error.message, 'error');
  }
}

/* ---------------- Program Management ---------------- */
function setupProgramForm() {
  const form = document.getElementById('addProgramForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const programData = {
      title: document.getElementById('programTitle').value,
      description: document.getElementById('programDescription').value
    };

    try {
      const response = await apiRequest('/programs', {
        method: 'POST',
        body: JSON.stringify(programData)
      });
      
      showMessage('Program added successfully!', 'success');
      form.reset();
    } catch (error) {
      showMessage('Failed to add program: ' + error.message, 'error');
    }
  });
}

function updateProgramsList(programs) {
  const programsList = document.getElementById('programsList');
  if (!programsList) return;

  if (programs.length === 0) {
    programsList.innerHTML = '<p class="no-programs">No programs available yet.</p>';
    return;
  }

  programsList.innerHTML = programs.map(program => `
    <div class="program-item" data-id="${program.id}">
      <div class="program-header">
        <h4>${program.title}</h4>
        <button class="btn-delete" onclick="deleteProgram(${program.id})">×</button>
      </div>
      <div class="program-details">
        <p>${program.description}</p>
      </div>
    </div>
  `).join('');
}

function updatePublicEvents(events) {
  const eventsGrid = document.getElementById('eventsGrid');
  if (!eventsGrid) return;

  if (events.length === 0) {
    eventsGrid.innerHTML = `
      <div class="no-events">
        <p>No events are currently scheduled.</p>
      </div>
    `;
    return;
  }

  eventsGrid.innerHTML = events.map(event => {
    const eventDate = new Date(event.date);
    const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = eventDate.getDate();
    
    return `
      <div class="event-card">
        <div class="event-date">
          <div class="event-month">${month}</div>
          <div class="event-day">${day}</div>
        </div>
        <div class="event-content">
          <h3>${event.title}</h3>
          <div class="event-meta">
            <span class="event-time">🕐 ${event.time}</span>
          </div>
          <p class="event-description">${event.description}</p>
        </div>
      </div>
    `;
  }).join('');
}

function updatePublicPrograms(programs) {
  const programsGrid = document.querySelector('.programs-grid');
  if (!programsGrid) return;

  if (programs.length === 0) {
    programsGrid.innerHTML = `
      <div class="no-programs">
        <p>No programs are currently available.</p>
      </div>
    `;
    return;
  }

  programsGrid.innerHTML = programs.map(program => `
    <div class="program-card">
      <h3>${program.title}</h3>
      <p>${program.description}</p>
    </div>
  `).join('');
}

async function deleteProgram(id) {
  if (!confirm('Are you sure you want to delete this program?')) return;

  try {
    await apiRequest(`/programs/${id}`, { method: 'DELETE' });
    showMessage('Program deleted successfully!', 'success');
  } catch (error) {
    showMessage('Failed to delete program: ' + error.message, 'error');
  }
}

/* ---------------- Admin Tabs ---------------- */
function setupAdminTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (!tabButtons.length) return;

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update button states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update content visibility
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.dataset.tab === targetTab) {
          content.classList.add('active');
        }
      });
    });
  });
}

/* ---------------- Layout Management ---------------- */
function updateLoginLayout() {
  const wrapper = document.querySelector('.login-admin-wrapper');
  if (wrapper) {
    if (isAuthenticated()) {
      wrapper.classList.add('logged-in');
    } else {
      wrapper.classList.remove('logged-in');
    }
  }
}

/* ---------------- Initialize App ---------------- */
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing ByteBloom');
  
  // Initialize WebSocket
  initWebSocket();
  
  // Update layout based on authentication status
  updateLoginLayout();
  
  // Redirect to login if not authenticated
  if (window.location.pathname.includes('admin.html') && !isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    window.location.href = 'login.html';
    return;
  }

  // Setup forms & UI
  console.log('Setting up forms and UI');
  setupLoginForm();
  loadSavedPassword();
  setupLogout();
  setupEventForm();
  setupProgramForm();
  setupAdminTabs();

  // Load initial data
  if (window.location.pathname.includes('admin.html')) {
    console.log('Loading admin data');
    apiRequest('/events').then(updateEventsList).catch(console.error);
    apiRequest('/programs').then(updateProgramsList).catch(console.error);
  } else if (window.location.pathname.includes('events.html')) {
    console.log('Loading public events data');
    apiRequest('/events').then(updatePublicEvents).catch(console.error);
  } else if (window.location.pathname.includes('programs.html')) {
    console.log('Loading public programs data');
    apiRequest('/programs').then(updatePublicPrograms).catch(console.error);
  }

  console.log('ByteBloom initialized successfully');
});
