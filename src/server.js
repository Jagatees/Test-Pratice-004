import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Regex patterns for detecting common XSS and SQL Injection attacks
// IMPORTANT: These are illustrative. Real-world applications need more comprehensive and robust validation.
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/im, // Basic script tag
  /on\w+=/i, // Event handlers like onerror, onload etc.
  /javascript:/i, // javascript: URIs
  /data:text\/html/i, // Data URIs with HTML
  /<!--.*?-->/gim, // HTML comments - might be used for obfuscation (less critical, but good to check)
];

const sqlInjectionPatterns = [
  /' OR \d+=\d+/i, // ' OR 1=1 --
  /SELECT .*? FROM /i, // Basic SELECT statement
  /UNION SELECT/i, // UNION SELECT
  /--/i, // SQL comment
  /xp_cmdshell/i, // Common SQL Server command execution
  /EXEC\(/i, // EXEC function
];

function verifySearchTerm(searchTerm) {
  let feedback = [];

  // Check for XSS patterns
  for (const pattern of xssPatterns) {
    if (pattern.test(searchTerm)) {
      feedback.push(
        'Detected potential Cross-Site Scripting (XSS) patterns. Please remove special characters or scripts.'
      );
      break; // Only need to detect one XSS pattern
    }
  }

  // Check for SQL Injection patterns
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(searchTerm)) {
      feedback.push(
        'Detected potential SQL Injection patterns. Please remove suspicious SQL keywords or characters.'
      );
      break; // Only need to detect one SQLi pattern
    }
  }

  const isValid = feedback.length === 0;
  return { isValid, feedback };
}

// Home page with the search form
app.get('/', (req, res) => {
  const feedbackMessage = req.query.feedback_message
    ? decodeURIComponent(req.query.feedback_message)
    : '';
  const searchTerm = req.query.searchTerm ? decodeURIComponent(req.query.searchTerm) : ''; // Keep input if invalid

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Search Page</title>
      <style>
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Search for Content</h1>
      <form action="/search" method="POST">
        <label>
          Search Term:
          <input type="text" id="searchTerm" name="searchTerm" value="${searchTerm}" required />
        </label><br/><br/>
        <button type="submit" id="search-button">Search</button>
      </form>
      ${feedbackMessage ? `<p class="error">${feedbackMessage}</p>` : ''}
    </body>
    </html>
  `);
});

// Handle search form submission
app.post('/search', (req, res) => {
  const searchTerm = req.body.searchTerm;
  const { isValid, feedback } = verifySearchTerm(searchTerm);

  if (isValid) {
    // If input is valid, redirect to display page
    res.redirect(`/display?searchTerm=${encodeURIComponent(searchTerm)}`);
  } else {
    // If input is unsafe, clear it (by not passing it back) and display feedback on home page
    res.redirect(
      `/?feedback_message=${encodeURIComponent(feedback.join('<br/>'))}`
    );
  }
});

// Display page for valid search terms
app.get('/display', (req, res) => {
  const searchTerm = req.query.searchTerm
    ? decodeURIComponent(req.query.searchTerm)
    : 'N/A';

  // IMPORTANT: For displaying user input in HTML, ALWAYS sanitize it to prevent XSS.
  // Although we pre-validated, it's a good practice.
  // Here we use a very basic replacement for demonstration.
  // In a real app, use a dedicated HTML escaping library like 'dompurify' (for server-side rendering).
  const safeSearchTerm = searchTerm.replace(/&/g, '&amp;')
                                   .replace(/</g, '&lt;')
                                   .replace(/>/g, '&gt;')
                                   .replace(/"/g, '&quot;')
                                   .replace(/'/g, '&#039;');

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
      <p>You searched for: <strong>${safeSearchTerm}</strong></p>
      <form action="/" method="GET">
        <button type="submit">Back to Home</button>
      </form>
    </body>
    </html>
  `);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { server, verifySearchTerm };