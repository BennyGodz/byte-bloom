/* ByteBloom client script
   Handles authentication, events, programs, and admin UI interactions.
*/

const AUTH_KEY = 'bytebloom_auth';
const PASSWORD_KEY = 'bytebloom_saved_password';
const USERNAME_KEY = 'bytebloom_saved_username';
const API_BASE = '/api';
const PROGRAMS_KEY = 'bytebloom_programs';

// Admin credentials (decoded)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // simplified for testing

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
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
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
  if (!loginForm) return;

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberPassword = document.getElementById('rememberPassword').checked;

    console.debug('Attempt login:', { username, pwLength: password ? password.length : 0 });

    if (checkCredentials(username, password)) {
      setAuthenticated(true);

      if (rememberPassword) {
        localStorage.setItem(USERNAME_KEY, username);
        localStorage.setItem(PASSWORD_KEY, password);
      } else {
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(PASSWORD_KEY);
      }

      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 400);
      return;
    }

    showMessage('Invalid username or password. Please try again.', 'error');
  });
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

/* ---------------- Initialize App ---------------- */
document.addEventListener('DOMContentLoaded', function() {
  // Redirect to login if not authenticated
  if (window.location.pathname.includes('admin.html') && !isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  // Setup forms & UI
  setupLoginForm();
  loadSavedPassword();
  setupLogout();

  console.log('ByteBloom initialized');
});
