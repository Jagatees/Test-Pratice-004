import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true })); // For parsing form data

// Load common passwords
const commonPasswordsPath = path.join(
  __dirname,
  "../data/10-million-password-list-top-1000.txt"
);
let commonPasswords = new Set();
try {
  const data = fs.readFileSync(commonPasswordsPath, "utf8");
  commonPasswords = new Set(data.split(/\r?\n/).filter(Boolean));
  console.log(`Loaded ${commonPasswords.size} common passwords.`);
} catch (err) {
  console.error(
    `Error loading common passwords file: ${err.message}. Password validation will not check against common passwords.`
  );
}

// OWASP Top 10 Proactive Controls C6: Implement Digital Identity under Level 1: Passwords – Password Requirements
function verifyPassword(password) {
  const minLength = 12;
  const maxLength = 64; // OWASP recommendation for good passwords
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(
    password
  );

  let errors = [];

  if (password.length < minLength || password.length > maxLength) {
    errors.push(
      `Password must be between ${minLength} and ${maxLength} characters long.`
    );
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!hasDigit) {
    errors.push("Password must contain at least one digit.");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character.");
  }

  // Check against common passwords
  if (commonPasswords.has(password)) {
    errors.push("Password is too common and has been leaked.");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// Endpoint to return the current timestamp (keeping existing functionality)
app.get("/timestamp", (req, res) => {
  res.json({ timestamp: getCurrentTimestamp() });
});

// Helper function to get the current timestamp
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Default home page with login form
app.get("/", (req, res) => {
  const errorMessage = req.query.error || "";
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Page</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f4f4f4; }
        .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        label { display: block; margin-bottom: 8px; font-weight: bold; }
        input[type="password"] { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background-color: #0056b3; }
        .error { color: red; margin-bottom: 15px; }
        .timestamp-info { margin-top: 20px; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Login</h1>
        ${
          errorMessage
            ? `<div class="error"><ul>${errorMessage
                .split(",")
                .map((msg) => `<li>${msg}</li>`)
                .join("")}</ul></div>`
            : ""
        }
        <form action="/login" method="post">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
          <button type="submit">Login</button>
        </form>
        <div class="timestamp-info">
            <p id="browser-info">Loading browser details...</p>
            <p id="timestamp">Fetching server timestamp...</p>
        </div>
      </div>

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
            document.getElementById('timestamp').textContent = 'Error fetching timestamp: ' + err.message;
          });
      </script>
    </body>
    </html>
  `);
});

// Login POST endpoint
app.post("/login", (req, res) => {
  const password = req.body.password;
  const validationResult = verifyPassword(password);

  if (validationResult.isValid) {
    res.redirect(`/welcome?password=${encodeURIComponent(password)}`);
  } else {
    // Redirect back to home with error message
    res.redirect(`/?error=${encodeURIComponent(validationResult.errors.join(","))}`);
  }
});

// Welcome page
app.get("/welcome", (req, res) => {
  const password = req.query.password || "N/A"; // In a real app, don't display the password
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #e6ffe6; }
        .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        h1 { color: #28a745; }
        p { color: #555; }
        button { background-color: #dc3545; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 20px; }
        button:hover { background-color: #c82333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome!</h1>
        <p>Your password: <strong>${password}</strong> (This is for demonstration purposes only. In a real application, never display passwords.)</p>
        <form action="/" method="get">
          <button type="submit">Logout</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Start the server
const PORT = 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

// Export the server for tests
export { server };