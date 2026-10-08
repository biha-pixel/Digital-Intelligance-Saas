import { expect, test, describe } from 'vitest';
import { isPrivateIPv4 } from '../../src/lib/security/ssrf';

describe('SSRF Guard - isPrivateIPv4', () => {
  test('rejects loopback addresses', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('127.1.2.3')).toBe(true);
  });

  test('rejects RFC1918 private networking', () => {
    // 10.0.0.0/8
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);

    // 192.168.0.0/16
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
  });

  test('rejects cloud metadata and Carrier-grade NAT', () => {
    expect(isPrivateIPv4('169.254.169.254')).toBe(true); // AWS/GCP/Azure meta
    expect(isPrivateIPv4('100.64.0.1')).toBe(true); // CGNAT
  });

  test('accepts public IPs', () => {
    expect(isPrivateIPv4('8.8.8.8')).toBe(false); // Google DNS
    expect(isPrivateIPv4('104.21.0.0')).toBe(false); // Cloudflare
  });
});
