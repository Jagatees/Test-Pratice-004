// import express from 'express';

// const app = express();

// // Endpoint to return the current timestamp
// app.get('/timestamp', (req, res) => {
//   res.json({ timestamp: getCurrentTimestamp() });
// });

// // Helper function to get the current timestamp
// export function getCurrentTimestamp() {
//   return new Date().toISOString();
// }


// // Serve a simple login page
// app.get('/login', (req, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>Login</title>
//     </head>
//     <body>
//       <h1>Login</h1>
//       <form id="login-form">
//         <label>
//           Email:
//           <input type="email" id="email" name="email" />
//         </label><br/><br/>
//         <label>
//           Password:
//           <input type="password" id="password" name="password" />
//         </label><br/><br/>
//         <button type="submit" id="login-button">Login</button>
//       </form>
//       <p id="message" style="color: green;"></p>
//       <script>
//         document.getElementById('login-form').addEventListener('submit', e => {
//           e.preventDefault();
//           const email = document.getElementById('email').value;
//           const pass  = document.getElementById('password').value;
//           // very basic “authentication”
//           if (email === 'test@example.com' && pass === 'password123') {
//             document.getElementById('message').textContent = 'Login successful!';
//           } else {
//             document.getElementById('message').textContent = 'Invalid credentials';
//           }
//         });
//       </script>
//     </body>
//     </html>
//   `);
// });


// // Serve a simple HTML page
// app.get('/', (req, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html lang="en">
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <title>Browser Info</title>
//     </head>
//     <body>
//       <h1>Browser and Timestamp Info</h1>
//       <p id="browser-info">Loading browser details...</p>
//       <p id="timestamp">Fetching server timestamp...</p>
//       <script>
//         // Display browser information
//         const userAgent = navigator.userAgent;
//         document.getElementById('browser-info').textContent = 'Your browser: ' + userAgent;

//         // Fetch and display the server timestamp
//         fetch('/timestamp')
//           .then(response => response.json())
//           .then(data => {
//             document.getElementById('timestamp').textContent = 'Server timestamp: ' + data.timestamp;
//           })
//           .catch(err => {
//             document.getElementById('timestamp').textContent = 'Error fetching timestamp';
//           });
//       </script>
//     </body>
//     </html>
//   `);
// });

// // Start the server
// const PORT = 3000;
// const server = app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server is running on port ${PORT}`);
// });

// // Export the server for tests
// export { server };"// trigger build" 

// server.js
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();

// parse URL‑encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Load the top‑1000 common passwords into a Set for fast lookup
const commonPasswords = new Set(
  fs
    .readFileSync(path.join(process.cwd(), '10-million-password-list-top-1000.txt'), 'utf-8')
    .split(/\r?\n/)
    .map(p => p.trim())
    .filter(Boolean)
);

// OWASP C6‑Level 1 password requirements + block commons
function validatePassword(pw) {
  const lengthReq  = pw.length >= 8;
  const upperReq   = /[A-Z]/.test(pw);
  const lowerReq   = /[a-z]/.test(pw);
  const digitReq   = /[0-9]/.test(pw);
  const specialReq = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
  const notCommon  = !commonPasswords.has(pw);
  return lengthReq && upperReq && lowerReq && digitReq && specialReq && notCommon;
}

// Home page / login form
app.get('/', (req, res) => {
  const err = req.query.error === '1'
    ? `<p style="color:red">Password does not meet complexity requirements or is too common.</p>`
    : '';
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Login</title>
      </head>
      <body>
        <h1>Enter Password</h1>
        ${err}
        <form method="POST" action="/login">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
          />
          <button type="submit">Login</button>
        </form>
      </body>
    </html>
  `);
});

// Handle form submit
app.post('/login', (req, res) => {
  const pw = req.body.password || '';
  if (!validatePassword(pw)) {
    // stay at home with error
    return res.redirect('/?error=1');
  }
  // redirect to welcome, passing pw via query (assignment spec)
  res.redirect(`/welcome?pw=${encodeURIComponent(pw)}`);
});

// Welcome page
app.get('/welcome', (req, res) => {
  const pw = req.query.pw;
  if (!pw) {
    return res.redirect('/');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/><title>Welcome</title></head>
      <body>
        <h1>Welcome!</h1>
        <p>Your password was: <strong>${pw}</strong></p>
        <form action="/logout" method="GET">
          <button type="submit">Logout</button>
        </form>
      </body>
    </html>
  `);
});

// Logout simply takes you back to /
app.get('/logout', (req, res) => {
  res.redirect('/');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
