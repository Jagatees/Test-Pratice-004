// tests/SeleniumTest.mjs

import { Builder, By, until } from 'selenium-webdriver';
import assert from 'assert';

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || 'local';

// URLs based on environment
const seleniumUrl = environment === 'github'
  ? 'http://selenium:4444/wd/hub'
  : 'http://localhost:4444/wd/hub';

const serverUrl = environment === 'github'
  ? 'http://testserver:3000'
  : 'http://host.docker.internal:3000';

console.log(`Running tests in '${environment}' environment`);
console.log(`Selenium URL: ${seleniumUrl}`);
console.log(`Server URL: ${serverUrl}`);

(async function testPasswordValidation() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(seleniumUrl)
    .build();

  try {
    console.log('--- Starting Password Validation Tests ---');

    // Test 1: Invalid common password
    console.log('→ Navigating to login page for common password test');
    await driver.get(serverUrl);

    let passwordInput = await driver.wait(until.elementLocated(By.id('password')), 5000);
    let loginButton   = await driver.wait(until.elementLocated(By.id('login-button')), 5000);

    await passwordInput.sendKeys('password');
    await loginButton.click();

    let errorMessage = await driver.wait(until.elementLocated(By.css('p.error')), 5000);
    let errorMessageText = await errorMessage.getText();
    assert.ok(errorMessageText.includes('Password is too common or has been previously compromised.'),
      `Test 1 Failed: Expected common password error, got: "${errorMessageText}"`);
    console.log('✅ Test 1 (Common password) passed');

    // Test 2: Invalid password (not meeting complexity requirements)
    console.log('→ Navigating to login page for complexity test');
    await driver.get(serverUrl);

    passwordInput = await driver.wait(until.elementLocated(By.id('password')), 5000);
    loginButton   = await driver.wait(until.elementLocated(By.id('login-button')), 5000);

    // Using 'abc' again. It should now trigger both the length and char type errors.
    await passwordInput.sendKeys('abc');
    await loginButton.click();

    errorMessage = await driver.wait(until.elementLocated(By.css('p.error')), 5000);
    errorMessageText = await errorMessage.getText();
    
    // Now both assertions for length and character types should pass,
    // as the message text should contain both due to '<br/>' in server.js
    assert.ok(errorMessageText.includes('Password must be at least 12 characters long.'),
      `Test 2 Failed: Expected min length error, got: "${errorMessageText}"`);
    assert.ok(errorMessageText.includes('Password must contain at least 3 of the following: lowercase, uppercase, numbers, special characters.'),
      `Test 2 Failed: Expected char type error, got: "${errorMessageText}"`);
    console.log('✅ Test 2 (Password complexity) passed');

    // Test 3: Valid password and successful login to welcome page
    console.log('→ Navigating to login page for valid password test');
    await driver.get(serverUrl);

    passwordInput = await driver.wait(until.elementLocated(By.id('password')), 5000);
    loginButton   = await driver.wait(until.elementLocated(By.id('login-button')), 5000);

    const validPassword = 'MySup3rS3cureP@ssw0rd!';
    await passwordInput.sendKeys(validPassword);
    await loginButton.click();

    await driver.wait(until.urlContains('/welcome'), 5000);
    const welcomeHeader = await driver.wait(until.elementLocated(By.css('h1')), 5000);
    assert.strictEqual(await welcomeHeader.getText(), 'Welcome!', 'Test 3 Failed: Expected "Welcome!" header on welcome page');
    
    const passwordDisplayEl = await driver.wait(until.elementLocated(By.xpath(`//p[contains(text(),'${validPassword}')]`), 5000));
    assert.ok(await passwordDisplayEl.isDisplayed(), 'Test 3 Failed: Entered password is not displayed on welcome page');

    console.log('✅ Test 3 (Valid password & Welcome page) passed');

     // Test 4: Logout from welcome page
    console.log('→ Testing logout functionality');
    const logoutButton = await driver.wait(until.elementLocated(By.css('form[action="/"] button[type="submit"]')), 5000);
    await logoutButton.click();

    // First, wait for the login form element to ensure the page has re-rendered
    const loginForm = await driver.wait(until.elementLocated(By.css('form[action="/login"]')), 5000);
    assert.ok(await loginForm.isDisplayed(), 'Test 4 Failed: Expected to return to login page by finding the login form.');
    
    await driver.wait(until.urlContains('/'), 10000); // allow flexibility in trailing slashes/query params
    await driver.wait(until.titleIs('Login'), 5000);

    const currentUrl = await driver.getCurrentUrl();
    console.log('🔎 URL after logout:', currentUrl);


    console.log('✅ Test 4 (Logout) passed');

    console.log('--- All Password Validation Tests Completed Successfully! ---');

  } catch (err) {
    console.error('❌ One or more tests failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();

(async function testTimestampPage() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(seleniumUrl)
    .build();

  try {
    console.log("\n--- Starting Timestamp Page Test ---");
    await driver.get(serverUrl + '/browser-info');

    let timestampElement = await driver.wait(
      until.elementLocated(By.id('timestamp')),
      5000
    );

    let timestampText = await timestampElement.getText();
    console.log(`Timestamp displayed: ${timestampText}`);

    const timestampMatch = timestampText.match(/Server timestamp:\s*(.*)/);
    assert.ok(timestampMatch, 'Timestamp text does not match expected format');
    const extractedTimestamp = timestampMatch[1];

    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    assert.match(extractedTimestamp, timestampRegex, 'Timestamp format is invalid');
    console.log('✅ Timestamp format is valid.');

  } catch (err) {
    console.error('❌ Timestamp page test failed:', err);
  } finally {
    await driver.quit();
  }
})();
