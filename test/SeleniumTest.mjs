import { Builder, By, until } from 'selenium-webdriver';
import assert from 'assert';

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || 'local';

// URLs based on environment
const seleniumUrl =
  environment === 'github'
    ? 'http://selenium:4444/wd/hub'
    : 'http://localhost:4444/wd/hub';

const serverUrl =
  environment === 'github'
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

    let passwordInput = await driver.wait(
      until.elementLocated(By.id('password')),
      5000
    );
    let loginButton = await driver.wait(
      until.elementLocated(By.id('login-button')),
      5000
    );

    await passwordInput.sendKeys('password');
    await loginButton.click();

    let errorMessage = await driver.wait(
      until.elementLocated(By.css('p.error')),
      5000
    );
    let errorMessageText = await errorMessage.getText();
    assert.ok(
      errorMessageText.includes(
        'Password is too common or has been previously compromised.'
      ),
      `Test 1 Failed: Expected common password error, got: "${errorMessageText}"`
    );
    console.log('✅ Test 1 (Common password) passed');

    // Test 2: Invalid password (not meeting complexity requirements)
    console.log('→ Navigating to login page for complexity test');
    await driver.get(serverUrl);

    passwordInput = await driver.wait(
      until.elementLocated(By.id('password')),
      5000
    );
    loginButton = await driver.wait(
      until.elementLocated(By.id('login-button')),
      5000
    );

    await passwordInput.sendKeys('abc');
    await loginButton.click();

    errorMessage = await driver.wait(
      until.elementLocated(By.css('p.error')),
      5000
    );
    errorMessageText = await errorMessage.getText();

    assert.ok(
      errorMessageText.includes('Password must be at least 12 characters long.'),
      `Test 2 Failed: Expected min length error, got: "${errorMessageText}"`
    );
    assert.ok(
      errorMessageText.includes(
        'Password must contain at least 3 of the following'
      ),
      `Test 2 Failed: Expected char type error, got: "${errorMessageText}"`
    );
    console.log('✅ Test 2 (Password complexity) passed');

    // Test 3: Valid password and successful login to welcome page
    console.log('→ Navigating to login page for valid password test');
    await driver.get(serverUrl);

    passwordInput = await driver.wait(
      until.elementLocated(By.id('password')),
      5000
    );
    loginButton = await driver.wait(
      until.elementLocated(By.id('login-button')),
      5000
    );

    const validPassword = 'MySup3rS3cureP@ssw0rd!';
    await passwordInput.sendKeys(validPassword);
    await loginButton.click();

    await driver.wait(until.urlContains('/welcome'), 5000);
    const welcomeHeader = await driver.wait(
      until.elementLocated(By.css('h1')),
      5000
    );
    assert.strictEqual(
      await welcomeHeader.getText(),
      'Welcome!',
      'Test 3 Failed: Expected "Welcome!" header on welcome page'
    );

    const passwordDisplayEl = await driver.wait(
      until.elementLocated(By.xpath(`//p[contains(text(),'${validPassword}')]`)),
      5000
    );
    assert.ok(
      await passwordDisplayEl.isDisplayed(),
      'Test 3 Failed: Entered password is not displayed on welcome page'
    );

    console.log('✅ Test 3 (Valid password & Welcome page) passed');

    // Test 4: Logout from welcome page
    console.log('→ Testing logout functionality');
    const logoutButton = await driver.wait(
      until.elementLocated(By.css('form[action="/"] button[type="submit"]')),
      5000
    );
    await logoutButton.click();

    const loginForm = await driver.wait(
      until.elementLocated(By.css('form[action="/login"]')),
      5000
    );
    assert.ok(
      await loginForm.isDisplayed(),
      'Test 4 Failed: Expected to return to login page by finding the login form.'
    );
    const title = await driver.getTitle();
    assert.strictEqual(
      title,
      'Login and Search',
      'Test 4 Failed: Incorrect page title after logout.'
    );

    console.log('✅ Test 4 (Logout) passed');
    console.log('--- All Password Validation Tests Completed Successfully! ---');
  } catch (err) {
    console.error('❌ One or more password tests failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();

(async function testSearchFunctionality() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(seleniumUrl)
    .build();

  try {
    console.log('\n--- Starting Search Functionality Tests ---');

    // Test 1: Valid search term
    console.log('→ Testing a valid search term');
    await driver.get(serverUrl);
    let searchInput = await driver.wait(
      until.elementLocated(By.id('search-term')),
      5000
    );
    let searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    const validSearchTerm = 'safe search query';
    await searchInput.sendKeys(validSearchTerm);
    await searchButton.click();

    await driver.wait(until.urlContains('/search-results'), 5000);
    const resultsHeader = await driver.wait(
      until.elementLocated(By.css('h1')),
      5000
    );
    assert.strictEqual(
      await resultsHeader.getText(),
      'Search Results',
      'Test 1 Failed: Did not navigate to search results page.'
    );
    const resultsText = await driver
      .wait(until.elementLocated(By.css('p > strong')), 5000)
      .getText();
    assert.strictEqual(
      resultsText,
      validSearchTerm,
      'Test 1 Failed: Search term not displayed correctly.'
    );
    console.log('✅ Test 1 (Valid search) passed');

    // Test 2: Return from results page
    console.log('→ Testing return to home from search results');
    const returnButton = await driver.wait(
      until.elementLocated(By.css('form[action="/"] button[type="submit"]')),
      5000
    );
    await returnButton.click();

    await driver.wait(until.elementLocated(By.id('search-button')), 5000);
    const title = await driver.getTitle();
    assert.strictEqual(
      title,
      'Login and Search',
      'Test 2 Failed: Did not return to the correct home page title.'
    );

    // **FIX APPLIED**: The previous check was too strict. This new check uses the
    // URL object to parse the current URL and verify that the path is the root ('/'),
    // which correctly handles cases like 'http://host/?'.
    const currentUrl = await driver.getCurrentUrl();
    const parsedUrl = new URL(currentUrl);
    assert.strictEqual(
      parsedUrl.pathname,
      '/',
      `Test 2 Failed: URL path should be the root '/'. Got: ${parsedUrl.pathname}`
    );
    console.log('✅ Test 2 (Return from results) passed');

    // Test 3: XSS attack attempt
    console.log('→ Testing XSS attack rejection');
    await driver.get(serverUrl);
    searchInput = await driver.wait(
      until.elementLocated(By.id('search-term')),
      5000
    );
    searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    await searchInput.sendKeys('<script>alert("danger")</script>');
    await searchButton.click();

    const searchError = await driver.wait(
      until.elementLocated(By.css('.error')),
      5000
    );
    const searchErrorText = await searchError.getText();
    assert.ok(
      searchErrorText.includes('Potential XSS attack blocked'),
      `Test 3 Failed: Expected XSS error, got: "${searchErrorText}"`
    );
    console.log('✅ Test 3 (XSS rejection) passed');

    // Test 4: SQL Injection attack attempt
    console.log('→ Testing SQL Injection attack rejection');
    await driver.get(serverUrl);
    searchInput = await driver.wait(
      until.elementLocated(By.id('search-term')),
      5000
    );
    searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    await searchInput.sendKeys("' UNION SELECT * FROM users; --");
    await searchButton.click();

    const sqlError = await driver.wait(
      until.elementLocated(By.css('.error')),
      5000
    );
    const sqlErrorText = await sqlError.getText();
    assert.ok(
      sqlErrorText.includes('Potential SQL attack blocked'),
      `Test 4 Failed: Expected SQL error, got: "${sqlErrorText}"`
    );
    console.log('✅ Test 4 (SQL Injection rejection) passed');

    console.log('--- All Search Functionality Tests Completed Successfully! ---');
  } catch (err) {
    console.error('❌ One or more search tests failed:', err);
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
    console.log('\n--- Starting Timestamp Page Test ---');
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