import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));

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

app.get('/', (req, res) => {
  const searchError = req.query.search_error
    ? decodeURIComponent(req.query.search_error)
    : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Search</title>
      <style>
        body { font-family: sans-serif; margin: 2em; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Search</h1>
      <form action="/search" method="POST">
        <label>
          Search Term:
          <input type="text" id="search-term" name="searchTerm" required />
        </label><br/><br/>
        <button type="submit" id="search-button">Search</button>
      </form>
      ${searchError ? `<p class="error">${searchError}</p>` : ''}
    </body>
    </html>
  `);
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { server };