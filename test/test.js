import { expect } from 'chai';
import {
  getCurrentTimestamp,
  server,
  verifySearchTerm,
} from '../src/server.js';

describe('Timestamp Function', () => {
  it('should return a valid ISO timestamp', () => {
    const timestamp = getCurrentTimestamp();
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(timestamp).to.match(isoRegex);
  });

  it('should return the current timestamp', () => {
    const timestamp = getCurrentTimestamp();
    const now = new Date().toISOString();
    expect(new Date(timestamp).getTime()).to.be.closeTo(
      new Date(now).getTime(),
      1000
    );
  });
});

describe('Search Term Verification', () => {
  it('should approve a valid, simple search term', () => {
    const result = verifySearchTerm('hello world');
    expect(result.isValid).to.be.true;
    expect(result.attackType).to.be.null;
  });

  it('should approve a search term with numbers and symbols', () => {
    const result = verifySearchTerm('product-123 & co.');
    expect(result.isValid).to.be.true;
    expect(result.attackType).to.be.null;
  });

  it('should reject a simple XSS attack with script tags', () => {
    const result = verifySearchTerm('<script>alert("XSS")</script>');
    expect(result.isValid).to.be.false;
    expect(result.attackType).to.equal('xss');
  });

  it('should reject an XSS attack with an onerror attribute', () => {
    const result = verifySearchTerm('<img src=x onerror=alert(1)>');
    expect(result.isValid).to.be.false;
    expect(result.attackType).to.equal('xss');
  });

  it('should reject a simple SQL injection attack', () => {
    const result = verifySearchTerm("' OR 1=1; --");
    expect(result.isValid).to.be.false;
    expect(result.attackType).to.equal('sql');
  });

  it('should reject a SQL injection attack with UNION SELECT', () => {
    const result = verifySearchTerm('admin" UNION SELECT 1,2,3 --');
    expect(result.isValid).to.be.false;
    expect(result.attackType).to.equal('sql');
  });

  it('should reject a SQL injection attack with DROP TABLE', () => {
    const result = verifySearchTerm('; DROP TABLE users;');
    expect(result.isValid).to.be.false;
    expect(result.attackType).to.equal('sql');
  });

  // Close the server after all tests in this file
  after(() => {
    server.close();
  });
});