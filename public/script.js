// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  setupClickMeButton();
  setupDonationButtons();
  setupNewsletterForm();
  setupProgramButtons();
  setupEventButtons();
  
  // Log initialization
  console.log('ByteBloom website initialized');
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
 * Setup donation buttons on the donate page
 */
function setupDonationButtons() {
  const donateBtn = document.getElementById('donateBtn');
  const donationButtons = document.querySelectorAll('.btn-donate');
  let selectedAmount = null;

  // Handle donation amount selection
  donationButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove selected class from all buttons
      donationButtons.forEach(btn => btn.classList.remove('selected'));
      
      // Add selected class to clicked button
      this.classList.add('selected');
      
      const amount = this.getAttribute('data-amount');
      selectedAmount = amount;
      
      if (amount === 'custom') {
        const customAmount = prompt('Enter your custom donation amount:');
        if (customAmount && !isNaN(customAmount) && parseFloat(customAmount) > 0) {
          selectedAmount = parseFloat(customAmount);
          showMessage(`Thank you for your donation of $${selectedAmount.toFixed(2)}!`, 'success');
        }
      } else {
        console.log(`Donation amount selected: $${amount}`);
      }
    });
  });

  // Handle main donate button
  if (donateBtn) {
    donateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Find selected amount
      const selectedButton = document.querySelector('.btn-donate.selected');
      if (selectedButton) {
        const amount = selectedButton.getAttribute('data-amount');
        if (amount && amount !== 'custom') {
          showMessage(`Thank you for your donation of $${amount}!`, 'success');
          console.log(`Donation processed: $${amount}`);
        } else if (amount === 'custom' && selectedAmount && typeof selectedAmount === 'number') {
          showMessage(`Thank you for your donation of $${selectedAmount.toFixed(2)}!`, 'success');
        } else {
          showMessage('Please select a donation amount first.', 'info');
        }
      } else {
        showMessage('Please select a donation amount first.', 'info');
      }
    });
  }
}

/**
 * Setup newsletter form on events page
 */
function setupNewsletterForm() {
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = this.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      
      if (email && isValidEmail(email)) {
        showMessage(`Thank you for subscribing! We'll send updates to ${email}`, 'success');
        emailInput.value = '';
        console.log('Newsletter subscription:', email);
      } else {
        showMessage('Please enter a valid email address.', 'error');
      }
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
  messageEl.className = `message-toast message-${type}`;
  messageEl.textContent = message;
  messageEl.setAttribute('role', 'alert');
  messageEl.setAttribute('aria-live', 'polite');

  // Add styles
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 5px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;

  // Set background color based on type
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3'
  };
  messageEl.style.backgroundColor = colors[type] || colors.info;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  if (!document.querySelector('style[data-toast-animation]')) {
    style.setAttribute('data-toast-animation', 'true');
    document.head.appendChild(style);
  }

  // Append to body
  document.body.appendChild(messageEl);

  // Remove after 5 seconds
  setTimeout(() => {
    messageEl.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      messageEl.remove();
    }, 300);
  }, 5000);
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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
