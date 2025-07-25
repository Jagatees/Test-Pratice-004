// tests/SeleniumTest.mjs

import { Builder, By, until } from 'selenium-webdriver';
import assert from 'assert';

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || 'local';

// URLs based on environment
// Obtain dev selenium server IP using: docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' selenium-server
const seleniumUrl = environment === 'github'
  ? 'http://selenium:4444/wd/hub'
  : 'http://localhost:4444/wd/hub';

const serverUrl = environment === 'github'
  ? 'http://testserver:3000'
  : 'http://host.docker.internal:3000';

console.log(`Running tests in '${environment}' environment`);
console.log(`Selenium URL: ${seleniumUrl}`);
console.log(`Server URL: ${serverUrl}`);

(async function testLogin() {
  // Initialize the WebDriver with Chrome
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(seleniumUrl)
    .build();

  try {
    console.log('→ Navigating to login page');
    await driver.get(`${serverUrl}/login`);

    // Locate the form fields and button
    const emailInput    = await driver.wait(until.elementLocated(By.id('email')), 5000);
    const passwordInput = await driver.findElement(By.id('password'));
    const loginButton   = await driver.findElement(By.id('login-button'));

    // Fill in valid credentials
    await emailInput.sendKeys('test@example.com');
    await passwordInput.sendKeys('password123');
    await loginButton.click();

    // Wait for the feedback message and verify it
    const messageEl   = await driver.wait(until.elementLocated(By.id('message')), 5000);
    const messageText = await messageEl.getText();
    assert.strictEqual(messageText, 'Login successful!');

    console.log('✅ Login test passed');
  } catch (err) {
    console.error('❌ Login test failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();
