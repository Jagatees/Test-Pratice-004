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

  const isValid = feedback.length === 0;

  return { isValid, feedback };
}

/**
 * Validates a search term against XSS and SQL Injection patterns.
 * @param {string} term The search term to validate.
 * @returns {{isValid: boolean, attackType: 'xss' | 'sql' | null}}
 */
export function verifySearchTerm(term) {
  // OWASP C5: Validate all inputs.
  // Basic XSS check: block common HTML tags and event handlers.
  const xssPattern = /<[^>]*script|<[^>]*onerror|<[^>]*onload/i;
  if (xssPattern.test(term)) {
    return { isValid: false, attackType: 'xss' };
  }

  // **FIXED**: Split SQL injection check into two more specific patterns.
  // Pattern for SQL keywords that should be whole words.
  const sqlKeywordPattern = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b/i;
  // Pattern for SQL comment/terminator characters that can be anywhere.
  const sqlCharPattern = /(--|;|\/\*|\*\/)/;

  if (sqlKeywordPattern.test(term) || sqlCharPattern.test(term)) {
    return { isValid: false, attackType: 'sql' };
  }

  return { isValid: true, attackType: null };
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.get('/timestamp', (req, res) => {
  res.json({ timestamp: getCurrentTimestamp() });
});

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

app.get('/', (req, res) => {
  const errorMessage = req.query.error_message
    ? decodeURIComponent(req.query.error_message)
    : '';
  const searchError = req.query.search_error
    ? decodeURIComponent(req.query.search_error)
    : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login and Search</title>
      <style>
        body { font-family: sans-serif; margin: 2em; }
        .error { color: red; }
        .success { color: green; }
        .container { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #ccc; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Search</h1>
        <form action="/search" method="POST">
          <label>
            Search Term:
            <input type="text" id="search-term" name="searchTerm" required />
          </label><br/><br/>
          <button type="submit" id="search-button">Search</button>
        </form>
        ${searchError ? `<p class="error">${searchError}</p>` : ''}
      </div>

      <div class="container">
        <h1>Login</h1>
        <form action="/login" method="POST">
          <label>
            Password:
            <input type="password" id="password" name="password" required />
          </label><br/><br/>
          <button type="submit" id="login-button">Login</button>
        </form>
        ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''}
      </div>
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
    res.redirect(
      `/?error_message=${encodeURIComponent(feedback.join('<br/>'))}`
    );
  }
});

app.post('/search', (req, res) => {
  const searchTerm = req.body.searchTerm || '';
  const { isValid, attackType } = verifySearchTerm(searchTerm);

  if (isValid) {
    res.redirect(`/search-results?term=${encodeURIComponent(searchTerm)}`);
  } else {
    const message = `Invalid input detected. Potential ${attackType.toUpperCase()} attack blocked.`;
    res.redirect(`/?search_error=${encodeURIComponent(message)}`);
  }
});

app.get('/search-results', (req, res) => {
  const searchTerm = req.query.term || '';
  // Defense in depth: escape the term even after validation.
  const escapedTerm = escapeHTML(searchTerm);

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Search Results</title>
    </head>
    <body>
      <h1>Search Results</h1>
      <p>You searched for: <strong>${escapedTerm}</strong></p>
      <form action="/" method="GET">
        <button type="submit">Return to Home</button>
      </form>
    </body>
    </html>
  `);
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