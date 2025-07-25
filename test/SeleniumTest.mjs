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
      'Search',
      'Test 2 Failed: Did not return to the correct home page title.'
    );

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