/* ByteBloom client script
  Handles authentication, events, programs, and admin UI interactions.
*/
const AUTH_KEY = 'bytebloom_auth';
const PASSWORD_KEY = 'bytebloom_saved_password';
const API_BASE = '/api';
const PROGRAMS_KEY = 'bytebloom_programs';

// API Helper Functions
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

/* Admin username and client-side obfuscated password (decoded below).
  Note: client-side auth is not secure for production.
*/
const ADMIN_USERNAME = 'admin';

// Obfuscated admin password (XOR 0x55).
const _ADMIN_PW_OBF = [52,49,56,60,59,100,103,102];
function decodeAdminPassword(arr) {
  return arr.map(c => String.fromCharCode(c ^ 0x55)).join('');
}
const ADMIN_PASSWORD = decodeAdminPassword(_ADMIN_PW_OBF);

/* Events are loaded from the API (server authoritative) */

/* DOM ready */
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  // Check if user is on admin page and verify authentication
  if (window.location.pathname.includes('admin.html')) {
    if (!isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }
  }

  // Initialize based on current page
  setupClickMeButton();
  setupProgramButtons();
  setupEventButtons();
  setupLoginForm();
  setupPasswordToggle();
  loadSavedPassword();
  setupAdminPanel();
  loadEvents();
  loadPrograms();
  
  console.log('ByteBloom initialized');
}

/**
 * Setup the "Click Me" button on the home page
 */
function setupClickMeButton() {
  const clickMeBtn = document.getElementById('clickMeBtn');
  if (clickMeBtn) {
    clickMeBtn.addEventListener('click', function() {
      showMessage('Thanks for clicking! We\'re excited to have you here!', 'success');
      console.log('Click Me button clicked');
    });
  }
}



/**
 * Setup program "Learn More" buttons
 */
function setupProgramButtons() {
  const programButtons = document.querySelectorAll('.program-card .btn-secondary');
  programButtons.forEach(button => {
    button.addEventListener('click', function() {
      const programCard = this.closest('.program-card');
      const programName = programCard.querySelector('h3').textContent;
      showMessage(`Thanks for your interest in ${programName}! More details coming soon.`, 'info');
      console.log(`Program interest: ${programName}`);
    });
  });
}

/**
 * Setup event "Register" buttons
 */
function setupEventButtons() {
  const eventButtons = document.querySelectorAll('.event-card .btn-secondary');
  eventButtons.forEach(button => {
    button.addEventListener('click', function() {
      const eventCard = this.closest('.event-card');
      const eventName = eventCard.querySelector('h3').textContent;
      showMessage(`Thanks for your interest in ${eventName}! Registration details coming soon.`, 'info');
      console.log(`Event interest: ${eventName}`);
    });
  });
}

/**
 * Show a message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (success, error, info)
 */
function showMessage(message, type = 'info') {
  // Remove existing message if any
  const existingMessage = document.querySelector('.message-toast');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message-toast message-toast-${type}`;
  messageEl.textContent = message;
  messageEl.setAttribute('role', 'alert');
  messageEl.setAttribute('aria-live', 'polite');

  // Append to body
  document.body.appendChild(messageEl);

  // Remove after 5 seconds
  setTimeout(() => {
    messageEl.classList.add('message-toast-hiding');
    setTimeout(() => {
      messageEl.remove();
    }, 300);
  }, 5000);
}

/* email validation removed (newsletter UI removed) */

/**
 * Smooth scroll to anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href !== '#' && href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
});

/**
 * Authentication Functions
 */

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const auth = localStorage.getItem(AUTH_KEY);
  return auth === 'true';
}

/**
 * Set authentication status
 */
function setAuthenticated(status) {
  if (status) {
    localStorage.setItem(AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

/**
 * Setup login form
 */
function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const rememberPassword = document.getElementById('rememberPassword').checked;

      try {
            // Client-side authentication using obfuscated password (not secure for production)
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
              setAuthenticated(true);
              // Use the same token string as before for compatibility
              localStorage.setItem('admin_token', 'admin-authenticated');

              // Save username and optionally password locally if requested
              if (rememberPassword) {
                localStorage.setItem('bytebloom_saved_username', username);
                localStorage.setItem(PASSWORD_KEY, password);
              } else {
                localStorage.removeItem('bytebloom_saved_username');
                localStorage.removeItem(PASSWORD_KEY);
              }

              showMessage('Login successful! Redirecting...', 'success');
              setTimeout(() => {
                window.location.href = 'admin.html';
              }, 700);
              return;
            }
      } catch (err) {
        console.error('Login failed:', err);
      }

      showMessage('Invalid username or password. Please try again.', 'error');
    });
  }
}

/**
 * Draw eye icon on canvas (open state - show password)
 */
function drawEyeOpen(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Set style
  ctx.strokeStyle = '#666';
  ctx.fillStyle = '#666';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw eye shape (top curve)
  ctx.beginPath();
  ctx.arc(centerX, centerY - 2, 6, 0.3, Math.PI - 0.3, false);
  ctx.stroke();
  
  // Draw eye shape (bottom curve)
  ctx.beginPath();
  ctx.arc(centerX, centerY + 2, 6, -0.3, -Math.PI + 0.3, true);
  ctx.stroke();
  
  // Draw pupil
  ctx.beginPath();
  ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw highlight on pupil
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(centerX - 1, centerY - 1, 1, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw eye icon on canvas (closed state - hide password)
 */
function drawEyeClosed(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Set style
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // Draw closed eye as a simple horizontal line
  ctx.beginPath();
  ctx.moveTo(centerX - 8, centerY);
  ctx.lineTo(centerX + 8, centerY);
  ctx.stroke();
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle() {
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');
  
  if (passwordToggle && passwordInput && eyeIcon) {
    // Initialize with closed eye (password hidden)
    drawEyeClosed(eyeIcon);
    passwordToggle.setAttribute('aria-label', 'Show password');
    
    passwordToggle.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Update icon
      if (type === 'text') {
        drawEyeOpen(eyeIcon);
        passwordToggle.setAttribute('aria-label', 'Hide password');
      } else {
        drawEyeClosed(eyeIcon);
        passwordToggle.setAttribute('aria-label', 'Show password');
      }
    });
  }
}

/**
 * Load saved password if available
 */
function loadSavedPassword() {
  const savedPassword = localStorage.getItem(PASSWORD_KEY);
  const savedUsername = localStorage.getItem('bytebloom_saved_username');
  const passwordInput = document.getElementById('password');
  const usernameInput = document.getElementById('username');
  const rememberCheckbox = document.getElementById('rememberPassword');
  
  if (savedPassword && passwordInput) {
    passwordInput.value = savedPassword;
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
  
  if (savedUsername && usernameInput) {
    usernameInput.value = savedUsername;
  }
}

/**
 * Setup logout button
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      setAuthenticated(false);
      showMessage('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    });
  }
}

/**
 * Event Management Functions
 */

/**
 * Get events from localStorage or return defaults
 */
// LocalStorage fallback removed — events are authoritative on the server.

/**
 * Load and display events on events page
 */
async function loadEvents() {
  const eventsGrid = document.querySelector('.events-grid');
  if (!eventsGrid) return;

  let events = [];
  try {
    events = await apiRequest('/events');
  } catch (err) {
    console.error('Failed to load events from API:', err);
    eventsGrid.innerHTML = '<p class="no-events">Unable to load events at this time. Please try again later.</p>';
    return;
  }

  eventsGrid.innerHTML = '';
  events.forEach(event => {
    const eventCard = createEventCard(event);
    eventsGrid.appendChild(eventCard);
  });

  // Re-setup event buttons after loading
  setupEventButtons();
}

/**
 * Create an event card element
 */
function createEventCard(event) {
  const article = document.createElement('article');
  article.className = 'event-card';
  
  const date = new Date(event.date);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  
  article.innerHTML = `
    <div class="event-date">
      <span class="event-month">${month}</span>
      <span class="event-day">${day}</span>
    </div>
    <div class="event-content">
      <h3>${escapeHtml(event.title)}</h3>
      <p class="event-time">${escapeHtml(event.time)}</p>
      <p>${escapeHtml(event.description)}</p>
      <button class="btn btn-secondary">Register</button>
    </div>
  `;
  
  return article;
}

/**
 * Setup admin panel
 */
function setupAdminPanel() {
  setupLogout();
  setupAddEventForm();
  loadAdminEventsList();
  setupAddProgramForm();
  loadAdminProgramsList();
}

/**
 * Setup add event form
 */
function setupAddEventForm() {
  const addEventForm = document.getElementById('addEventForm');
  if (addEventForm) {
    addEventForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const title = document.getElementById('eventTitle').value.trim();
      const date = document.getElementById('eventDate').value;
      const time = document.getElementById('eventTime').value.trim();
      const description = document.getElementById('eventDescription').value.trim();
      
      if (!title || !date || !time || !description) {
        showMessage('Please fill in all fields', 'error');
        return;
      }
      const token = localStorage.getItem('admin_token');

      (async () => {
        try {
          const created = await apiRequest('/events', {
            method: 'POST',
            headers: { 'Authorization': token || '' },
            body: JSON.stringify({ title, date, time, description })
          });

          showMessage('Event added successfully!', 'success');
          addEventForm.reset();
          loadAdminEventsList();
          if (window.location.pathname.includes('events.html')) {
            // Refresh events to ensure new event appears and buttons are wired
            await loadEvents();
            setupEventButtons();
          }
          return;
        } catch (err) {
          console.error('Failed to create event via API:', err);
          showMessage('Failed to add event. Ensure the API server is running.', 'error');
        }
      })();
    });
  }
}

/**
 * Load events list in admin panel
 */
async function loadAdminEventsList() {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;
  
  try {
    const token = localStorage.getItem('admin_token');
    const events = await apiRequest('/events', { headers: { 'Authorization': token || '' } });

    if (!events || events.length === 0) {
      eventsList.innerHTML = '<p class="no-events">No events yet. Add your first event above!</p>';
      return;
    }

    eventsList.innerHTML = '';

    events.forEach(event => {
      const eventItem = document.createElement('div');
      eventItem.className = 'admin-event-item';
      
      const date = new Date(event.date);
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      eventItem.innerHTML = `
        <div class="admin-event-content">
          <h4>${escapeHtml(event.title)}</h4>
          <p class="admin-event-meta">
            <strong>Date:</strong> ${formattedDate} | 
            <strong>Time:</strong> ${escapeHtml(event.time)}
          </p>
          <p class="admin-event-description">${escapeHtml(event.description)}</p>
        </div>
        <button class="btn btn-secondary btn-delete" data-event-id="${event.id}">Delete</button>
      `;
      
      // Add delete functionality
      const deleteBtn = eventItem.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', async function() {
        if (confirm(`Are you sure you want to delete "${event.title}"?`)) {
          await deleteEvent(event.id);
        }
      });
      
      eventsList.appendChild(eventItem);
    });
  } catch (error) {
    console.error('Error loading admin events:', error);
    eventsList.innerHTML = '<p class="no-events">Error loading events. Please refresh the page.</p>';
  }
}

/**
 * Delete an event
 */
function deleteEvent(eventId) {
  (async () => {
    const token = localStorage.getItem('admin_token');
    try {
      await apiRequest(`/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token || '' }
      });

      showMessage('Event deleted successfully!', 'success');
      loadAdminEventsList();
      if (window.location.pathname.includes('events.html')) {
        // Refresh events after deletion to re-render the list and wire buttons
        await loadEvents();
        setupEventButtons();
      }
      return;
    } catch (err) {
      console.error('Failed to delete event via API:', err);
      showMessage('Failed to delete event. Ensure the API server is running.', 'error');
    }
  })();
}

/* ---------------- Programs Management ---------------- */

// Local fallback for programs
function getProgramsLocal() {
  const stored = localStorage.getItem(PROGRAMS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing programs:', e);
      return [];
    }
  }
  return [];
}

function saveProgramsLocal(programs) {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
}

// Load and display programs on the Programs page
async function loadPrograms() {
  const programsGrid = document.querySelector('.programs-grid');
  if (!programsGrid) return;

  let programs = [];
  try {
    programs = await apiRequest('/programs');
  } catch (err) {
    console.warn('Falling back to local programs:', err);
    programs = getProgramsLocal();
  }

  programsGrid.innerHTML = '';
  if (!programs || programs.length === 0) {
    programsGrid.innerHTML = '<p>No public programs are listed yet.</p>';
    return;
  }

  programs.forEach(program => {
    const card = createProgramCard(program);
    programsGrid.appendChild(card);
  });
}

function createProgramCard(program) {
  const article = document.createElement('article');
  article.className = 'program-card';
  article.innerHTML = `
    <h3>${escapeHtml(program.title)}</h3>
    <p>${escapeHtml(program.description)}</p>
    <button class="btn btn-secondary">Learn More</button>
  `;
  return article;
}

// Setup add program form in admin panel
function setupAddProgramForm() {
  const addProgramForm = document.getElementById('addProgramForm');
  if (!addProgramForm) return;

  addProgramForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('programTitle').value.trim();
    const description = document.getElementById('programDescription').value.trim();

    if (!title || !description) {
      showMessage('Please fill in all program fields', 'error');
      return;
    }

    const token = localStorage.getItem('admin_token');

    (async () => {
      try {
        const created = await apiRequest('/programs', {
          method: 'POST',
          headers: { 'Authorization': token || '' },
          body: JSON.stringify({ title, description })
        });

        showMessage('Program added successfully!', 'success');
        addProgramForm.reset();
        loadAdminProgramsList();
        if (window.location.pathname.includes('programs.html')) {
          loadPrograms();
        }
        return;
      } catch (err) {
        console.warn('API create program failed, falling back to local', err);
      }

      // Fallback local
      const programs = getProgramsLocal();
      const newProgram = { id: Date.now(), title, description };
      programs.push(newProgram);
      saveProgramsLocal(programs);
      showMessage('Program added locally (offline)', 'success');
      addProgramForm.reset();
      loadAdminProgramsList();
      if (window.location.pathname.includes('programs.html')) {
        loadPrograms();
      }
    })();
  });
}

// Load admin programs list
async function loadAdminProgramsList() {
  const programsList = document.getElementById('programsList');
  if (!programsList) return;

  try {
    let programs = [];
    try {
      const token = localStorage.getItem('admin_token');
      programs = await apiRequest('/programs', { headers: { 'Authorization': token || '' } });
    } catch (err) {
      programs = getProgramsLocal();
    }

    if (!programs || programs.length === 0) {
      programsList.innerHTML = '<p class="no-programs">No programs yet. Add your first program above!</p>';
      return;
    }

    programsList.innerHTML = '';
    programs.forEach(program => {
      const item = document.createElement('div');
      item.className = 'admin-program-item';
      item.innerHTML = `
        <div class="admin-program-content">
          <h4>${escapeHtml(program.title)}</h4>
          <p class="admin-program-description">${escapeHtml(program.description)}</p>
        </div>
        <button class="btn btn-secondary btn-delete" data-program-id="${program.id}">Delete</button>
      `;

      const deleteBtn = item.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', async function() {
        if (confirm(`Are you sure you want to delete "${program.title}"?`)) {
          await deleteProgram(program.id);
        }
      });

      programsList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading admin programs:', error);
    programsList.innerHTML = '<p class="no-programs">Error loading programs. Please refresh the page.</p>';
  }
}

// Delete a program
function deleteProgram(programId) {
  (async () => {
    const token = localStorage.getItem('admin_token');
    try {
      await apiRequest(`/programs/${programId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token || '' }
      });

      showMessage('Program deleted successfully!', 'success');
      loadAdminProgramsList();
      if (window.location.pathname.includes('programs.html')) {
        loadPrograms();
      }
      return;
    } catch (err) {
      console.warn('API delete failed, falling back to local', err);
    }

    // Fallback local delete
    const programs = getProgramsLocal();
    const filtered = programs.filter(p => p.id !== programId);
    saveProgramsLocal(filtered);
    showMessage('Program deleted (local)', 'success');
    loadAdminProgramsList();
    if (window.location.pathname.includes('programs.html')) {
      loadPrograms();
    }
  })();
}


/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

