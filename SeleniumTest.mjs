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

(async function testSearchFunctionality() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .usingServer(seleniumUrl)
    .build();

  try {
    console.log('--- Starting Search Functionality Tests ---');

    // Test 1: Valid Search Term
    console.log('→ Navigating to home page for valid search test');
    await driver.get(serverUrl);

    let searchTermInput = await driver.wait(
      until.elementLocated(By.id('searchTerm')),
      5000
    );
    let searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    const validTerm = 'hello world';
    await searchTermInput.sendKeys(validTerm);
    await searchButton.click();

    await driver.wait(until.urlContains('/display'), 5000);
    const resultTextElement = await driver.wait(
      until.elementLocated(By.xpath(`//p[contains(text(),'${validTerm}')]`), 5000)
    );
    assert.ok(
      await resultTextElement.isDisplayed(),
      `Test 1 Failed: Expected "${validTerm}" to be displayed on results page`
    );
    console.log('✅ Test 1 (Valid search term) passed');

    // Test 2: XSS Attack Attempt
    console.log('→ Navigating to home page for XSS attack test');
    await driver.get(serverUrl); // Go back to home to clear previous state

    searchTermInput = await driver.wait(
      until.elementLocated(By.id('searchTerm')),
      5000
    );
    searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    const xssTerm = '<script>alert("XSS")</script>';
    await searchTermInput.sendKeys(xssTerm);
    await searchButton.click();

    // Expect to stay on the home page and see an error message
    await driver.wait(until.urlContains('/?feedback_message='), 5000); // Check for feedback message in URL
    const errorMessage = await driver.wait(
      until.elementLocated(By.css('p.error')),
      5000
    );
    const errorMessageText = await errorMessage.getText();
    assert.ok(
      errorMessageText.includes(
        'Detected potential Cross-Site Scripting (XSS) patterns.'
      ),
      `Test 2 Failed: Expected XSS error, got: "${errorMessageText}"`
    );
    // Verify input field is cleared
    const clearedInputVal = await searchTermInput.getAttribute('value');
    assert.strictEqual(
      clearedInputVal,
      '',
      'Test 2 Failed: Expected search input to be cleared after XSS attempt'
    );
    console.log('✅ Test 2 (XSS attack attempt) passed');

    // Test 3: SQL Injection Attack Attempt
    console.log('→ Navigating to home page for SQL Injection attack test');
    await driver.get(serverUrl); // Go back to home to clear previous state

    searchTermInput = await driver.wait(
      until.elementLocated(By.id('searchTerm')),
      5000
    );
    searchButton = await driver.wait(
      until.elementLocated(By.id('search-button')),
      5000
    );

    const sqlTerm = "' OR 1=1 --";
    await searchTermInput.sendKeys(sqlTerm);
    await searchButton.click();

    // Expect to stay on the home page and see an error message
    await driver.wait(until.urlContains('/?feedback_message='), 5000); // Check for feedback message in URL
    const sqlErrorMessage = await driver.wait(
      until.elementLocated(By.css('p.error')),
      5000
    );
    const sqlErrorMessageText = await sqlErrorMessage.getText();
    assert.ok(
      sqlErrorMessageText.includes('Detected potential SQL Injection patterns.'),
      `Test 3 Failed: Expected SQL Injection error, got: "${sqlErrorMessageText}"`
    );
    // Verify input field is cleared
    const clearedSqlInputVal = await searchTermInput.getAttribute('value');
    assert.strictEqual(
      clearedSqlInputVal,
      '',
      'Test 3 Failed: Expected search input to be cleared after SQLi attempt'
    );
    console.log('✅ Test 3 (SQL Injection attack attempt) passed');

    // Test 4: Return to Home Page from Display Page
    console.log('→ Navigating back to display page for return home test');
    // First, navigate to display page with a valid term
    await driver.get(`${serverUrl}/display?searchTerm=testReturn`);
    await driver.wait(until.urlContains('/display'), 5000);

    const backButton = await driver.wait(
      until.elementLocated(By.css('form[action="/"] button[type="submit"]')),
      5000
    );
    await backButton.click();

    // Expect to return to the home page
    await driver.wait(until.urlIs(serverUrl + '/'), 5000);
    const homeHeader = await driver.wait(
      until.elementLocated(By.css('h1')),
      5000
    );
    assert.strictEqual(
      await homeHeader.getText(),
      'Search for Content',
      'Test 4 Failed: Expected to return to Search Page'
    );
    console.log('✅ Test 4 (Return to Home Page) passed');

    console.log('--- All Search Functionality Tests Completed Successfully! ---');
  } catch (err) {
    console.error('❌ One or more tests failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();