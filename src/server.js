import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));

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
    process.exit(1);
  }
}

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

  if (score < 3) { // This condition is true for 'abc'
    feedback.push(
      'Password must contain at least 3 of the following: lowercase, uppercase, numbers, special characters.'
    );
  }

  if (commonPasswords.has(password)) {
    feedback.push(
      'Password is too common or has been previously compromised. Please choose a different one.'
    );
  }

  const isValid = feedback.length === 0;

  return { isValid, feedback };
}

app.get('/timestamp', (req, res) => {
  res.json({ timestamp: getCurrentTimestamp() });
});

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

app.get('/', (req, res) => {
  // Use 'error_message' as query parameter for clarity
  const errorMessage = req.query.error_message ? decodeURIComponent(req.query.error_message) : '';
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
        <button type="submit" id="login-button">Login</button>
      </form>
      ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''} <!-- Display HTML directly -->
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const password = req.body.password;
  const { isValid, feedback } = verifyPassword(password);

  if (isValid) {
    res.redirect(`/welcome?password=${encodeURIComponent(password)}`);
  } else {
    // MODIFIED: Join feedback messages with <br/> for distinct lines in HTML
    // and use 'error_message' query parameter
    res.redirect(`/?error_message=${encodeURIComponent(feedback.join('<br/>'))}`);
  }
});

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
        const userAgent = navigator.userAgent;
        document.getElementById('browser-info').textContent = 'Your browser: ' + userAgent;

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

const server = app.listen(PORT, '0.0.0.0', async () => {
  await loadCommonPasswords();
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { server, verifyPassword };