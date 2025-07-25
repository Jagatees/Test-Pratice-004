import { Builder, By, until } from "selenium-webdriver";
import assert from "assert";

// Get the argument (default to 'local' if not provided)
const environment = process.argv[2] || "local";

// URLs based on environment
const seleniumUrl =
  environment === "github"
    ? "http://selenium:4444/wd/hub"
    : "http://localhost:4444/wd/hub";
const serverUrl =
  environment === "github"
    ? "http://testserver:3000"
    : "http://host.docker.internal:3000";

console.log(`Running Selenium Login tests in '${environment}' environment`);
console.log(`Selenium URL: ${seleniumUrl}`);
console.log(`Server URL: ${serverUrl}`);

(async function testLoginFlow() {
  let driver;
  try {
    driver =
      environment === "github"
        ? await new Builder()
            .forBrowser("chrome")
            .usingServer(seleniumUrl) // Specify the Selenium server
            .build()
        : await new Builder()
            .forBrowser("chrome")
            .usingServer(seleniumUrl) // Specify the Selenium server
            .build();

    console.log("Selenium WebDriver initialized.");

    // Test Case 1: Load home page and check elements
    await driver.get(serverUrl);
    console.log("Navigated to home page.");
    await driver.wait(until.elementLocated(By.id("password")), 5000);
    const passwordInput = await driver.findElement(By.id("password"));
    const loginButton = await driver.findElement(By.css('button[type="submit"]'));
    assert.ok(passwordInput, "Password input field not found.");
    assert.ok(loginButton, "Login button not found.");
    console.log("Home page elements verified.");

    // Test Case 2: Attempt login with a weak password (e.g., too short)
    await passwordInput.clear();
    await passwordInput.sendKeys("short"); // Too short, no special, no digit, no upper
    await loginButton.click();

    // Verify redirection to home page and error message
    await driver.wait(until.urlContains("/?error="), 5000);
    const errorMessageElement = await driver.findElement(By.className("error"));
    const errorMessage = await errorMessageElement.getText();
    console.log(`Error message for weak password: ${errorMessage}`);
    assert.ok(errorMessage.includes("Password must be between 12 and 64 characters long."), "Missing length error");
    assert.ok(errorMessage.includes("Password must contain at least one uppercase letter."), "Missing uppercase error");
    // Add more assertions for other expected errors for "short"

    console.log("Weak password test passed.");

    // Test Case 3: Attempt login with a common password
    await driver.get(serverUrl); // Go back to clear previous state
    await driver.wait(until.elementLocated(By.id("password")), 5000);
    await driver.findElement(By.id("password")).sendKeys("password"); // Common password
    await driver.findElement(By.css('button[type="submit"]')).click();

    await driver.wait(until.urlContains("/?error="), 5000);
    const commonPasswordErrorMessageElement = await driver.findElement(
      By.className("error")
    );
    const commonPasswordErrorMessage =
      await commonPasswordErrorMessageElement.getText();
    console.log(
      `Error message for common password: ${commonPasswordErrorMessage}`
    );
    assert.ok(
      commonPasswordErrorMessage.includes("Password is too common and has been leaked."),
      "Common password error not found."
    );
    console.log("Common password test passed.");


    // Test Case 4: Attempt login with a valid password
    await driver.get(serverUrl); // Go back to clear previous state
    await driver.wait(until.elementLocated(By.id("password")), 5000);
    await driver.findElement(By.id("password")).sendKeys("MyStrongP@ssw0rd1"); // Valid password
    await driver.findElement(By.css('button[type="submit"]')).click();

    // Verify redirection to welcome page
    await driver.wait(until.urlContains("/welcome"), 5000);
    const welcomeHeading = await driver.findElement(By.css("h1"));
    assert.strictEqual(
      await welcomeHeading.getText(),
      "Welcome!",
      "Welcome page heading incorrect."
    );
    console.log("Valid password test passed, navigated to welcome page.");

    // Test Case 5: Logout from welcome page
    const logoutButton = await driver.findElement(By.css('button[type="submit"]'));
    await logoutButton.click();

    // Verify redirection back to home page
    await driver.wait(until.urlIs(serverUrl + "/"), 5000);
    console.log("Logout test passed, navigated back to home page.");

  } catch (err) {
    console.error("Selenium Login Test failed:", err);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
})();