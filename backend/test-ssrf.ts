import { validateUrlSSRF } from './src/utils/security';
import { CrawlerService } from './src/services/CrawlerService';

async function testSSRF() {
  console.log("--- SSRF TESTS ---");
  // Override NODE_ENV to production to enforce strict SSRF rules
  process.env.NODE_ENV = 'production';
  
  const testCases = [
    'http://localhost',
    'http://127.0.0.1',
    'http://169.254.169.254', // AWS metadata
    'ftp://10.0.0.1',
    'file:///etc/passwd',
    'http://invalid-domain-that-does-not-exist.com',
  ];

  for (const url of testCases) {
    const isSafe = await validateUrlSSRF(url);
    console.log(`${url} => ${isSafe ? 'SAFE' : 'BLOCKED'}`);
  }
}

async function testCrawler() {
  console.log("\n--- CRAWLER TESTS ---");
  const crawler = new CrawlerService();
  
  // This domain is unresolvable or takes a long time, verifying the DNS timeout fix
  const start = Date.now();
  console.log("Fetching blackholed domain...");
  // Using a domain that fails DNS resolution or times out
  const res = await crawler.fetchPage('http://this-domain-does-not-exist-123456.com');
  const elapsed = Date.now() - start;
  console.log(`Unresolvable domain fetch returned: ${res}, time taken: ${elapsed}ms (should be ~2000ms due to our DNS timeout fix)`);
}

async function run() {
  await testSSRF();
  await testCrawler();
}

run().catch(console.error);
