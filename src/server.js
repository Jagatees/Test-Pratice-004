import express from 'express';

const app = express();

// Endpoint to return the current timestamp
app.get('/timestamp', (req, res) => {
  res.json({ timestamp: getCurrentTimestamp() });
});

// Helper function to get the current timestamp
export function getCurrentTimestamp() {
  return new Date().toISOString();
}


// Serve a simple login page
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login</title>
    </head>
    <body>
      <h1>Login</h1>
      <form id="login-form">
        <label>
          Email:
          <input type="email" id="email" name="email" />
        </label><br/><br/>
        <label>
          Password:
          <input type="password" id="password" name="password" />
        </label><br/><br/>
        <button type="submit" id="login-button">Login</button>
      </form>
      <p id="message" style="color: green;"></p>
      <script>
        document.getElementById('login-form').addEventListener('submit', e => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const pass  = document.getElementById('password').value;
          // very basic “authentication”
          if (email === 'test@example.com' && pass === 'password123') {
            document.getElementById('message').textContent = 'Login successful!';
          } else {
            document.getElementById('message').textContent = 'Invalid credentials';
          }
        });
      </script>
    </body>
    </html>
  `);
});


// Serve a simple HTML page
app.get('/', (req, res) => {
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
const PORT = 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export the server for tests
export { server };"// trigger build" 
