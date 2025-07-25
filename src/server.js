import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse URL-encoded bodies (for form data)
app.use(express.urlencoded({ extended: true }));

// --- Password Validation ---
let commonPasswords = new Set();
const COMMON_PASSWORDS_FILE = path.join(
  __dirname,
  '10-million-password-list-top-1000.txt'
);

async function loadCommonPasswords() {
  try {
    const data = await fs.readFile(COMMON_PASSWORDS_FILE, 'utf8');
    data.split('\n').forEach((password) => {
      const trimmedPassword = password.trim();
      if (trimmedPassword) {
        commonPasswords.add(trimmedPassword);
      }
    });
    console.log(
      `Loaded ${commonPasswords.size} common passwords from ${COMMON_PASSWORDS_FILE}`
    );
  } catch (err) {
    console.error(`Error loading common passwords file: ${err.message}`);
    // Exit if the common password list cannot be loaded, as it's a critical security control.
    // In a production environment, you might have a fallback or alert system.
    process.exit(1);
  }
}

// OWASP Top 10 Proactive Controls C6: Implement Digital Identity - Level 1: Password Requirements
// - Minimum length of 12 characters.
// - Requires at least 3 out of 4 character types: uppercase letters, lowercase letters, numbers, and special characters.
// - Not found in a list of common/compromised passwords.
function verifyPassword(password) {
  const minLength = 12;
  let score = 0;
  let feedback = [];

  if (password.length < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long.`);
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (hasLowercase) score++;
  if (hasUppercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (score < 3) {
    feedback.push(
      'Password must contain at least 3 of the following: lowercase, uppercase, numbers, special characters.'
    );
  }

  if (commonPasswords.has(password)) {
    feedback.push(
      'Password is too common or has been previously compromised. Please choose a different one.'
    );
  }

  // If there's any feedback, the password failed at least one requirement
  const isValid = feedback.length === 0;

  return { isValid, feedback };
}
// --- End Password Validation ---

// Endpoint to return the current timestamp
app.get('/timestamp', (req, res) => {
  res.json({ timestamp: getCurrentTimestamp() });
});

// Helper function to get the current timestamp
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Serve the default home page with the password form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login</title>
      <style>
        .error { color: red; }
        .success { color: green; }
      </style>
    </head>
    <body>
      <h1>Login</h1>
      <form action="/login" method="POST">
        <label>
          Password:
          <input type="password" id="password" name="password" required />
        </label><br/><br/>
        <button type="submit" id="login-button">Login</button> <!-- ADDED ID HERE -->
      </form>
      ${req.query.message ? `<p class="error">${req.query.message}</p>` : ''}
    </body>
    </html>
  `);
});

// Handle password submission
app.post('/login', (req, res) => {
  const password = req.body.password;
  const { isValid, feedback } = verifyPassword(password);

  if (isValid) {
    res.redirect(`/welcome?password=${encodeURIComponent(password)}`);
  } else {
    res.redirect(`/?message=${encodeURIComponent(feedback.join(' '))}`);
  }
});

// Welcome page
app.get('/welcome', (req, res) => {
  const enteredPassword = req.query.password || 'N/A';
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
    </head>
    <body>
      <h1>Welcome!</h1>
      <p>You entered a strong password.</p>
      <p>Your password (for demonstration only): ${enteredPassword}</p>
      <form action="/" method="GET">
        <button type="submit">Logout</button>
      </form>
    </body>
    </html>
  `);
});

// Serve a simple HTML page (original / route for browser info, now different from default home)
app.get('/browser-info', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Browser Info</title>
    </head>
    <body>
      <h1>Browser and Timestamp Info</h1>
      <p id="browser-info">Loading browser details...</p>
      <p id="timestamp">Fetching server timestamp...</p>
      <script>
        // Display browser information
        const userAgent = navigator.userAgent;
        document.getElementById('browser-info').textContent = 'Your browser: ' + userAgent;

        // Fetch and display the server timestamp
        fetch('/timestamp')
          .then(response => response.json())
          .then(data => {
            document.getElementById('timestamp').textContent = 'Server timestamp: ' + data.timestamp;
          })
          .catch(err => {
            document.getElementById('timestamp').textContent = 'Error fetching timestamp';
          });
      </script>
    </body>
    </html>
  `);
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', async () => {
  await loadCommonPasswords(); // Load passwords before the server starts listening for requests
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the server for tests
export { server, verifyPassword };