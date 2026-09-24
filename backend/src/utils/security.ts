import dns from 'dns';
import { promisify } from 'util';
import ipaddr from 'ipaddr.js';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

const resolve4 = (hostname: string) => withTimeout(resolve4Async(hostname), 2000);
const resolve6 = (hostname: string) => withTimeout(resolve6Async(hostname), 2000);

export async function validateUrlSSRF(targetUrl: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(targetUrl);
    
    // Only allow HTTP/HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }

    // In non-production, you might skip SSRF checks for local dev, 
    // but the assignment explicitly requires rejecting private and loopback addresses in production.
    if (process.env.NODE_ENV !== 'production') {
       // We still run the checks but maybe allow localhost if configured, 
       // but wait, the assignment says "The company sites used with this command may be served from a local address, so your retrieval code must not assume a particular host".
       // Actually, the assignment states: "reject private and loopback addresses IN PRODUCTION".
       // So we check NODE_ENV.
    }

    let ips: string[] = [];
    try {
      ips = await resolve4(parsedUrl.hostname);
    } catch (e) {
      // ignore
    }

    if (ips.length === 0) {
      try {
        ips = await resolve6(parsedUrl.hostname);
      } catch (e) {
        // ignore
      }
    }

    if (ips.length === 0) {
      // If we can't resolve it, we can't verify it. Let axios try, but it might be unsafe if it resolves differently.
      // For safety, we can return true but let axios fail if it's invalid.
      // Wait, let's just parse the hostname if it's an IP directly.
      if (ipaddr.isValid(parsedUrl.hostname)) {
        ips = [parsedUrl.hostname];
      } else {
         return false; // Can't resolve
      }
    }

    if (process.env.NODE_ENV === 'production') {
      for (const ipStr of ips) {
        if (ipaddr.isValid(ipStr)) {
          const ip = ipaddr.parse(ipStr);
          const range = ip.range();
          // Reject private, loopback, linkLocal, etc.
          if (range === 'private' || range === 'loopback' || range === 'linkLocal' || range === 'uniqueLocal' || range === 'carrierGradeNat') {
            return false;
          }
        }
      }
    }

    return true;
  } catch (err) {
    return false; // Invalid URL parsing
  }
}
