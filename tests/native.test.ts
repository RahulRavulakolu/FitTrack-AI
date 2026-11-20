import { describe, expect, it } from 'vitest';
import { validServerUrl } from '../src/lib/native';

describe('phone server address validation', () => {
  it('accepts secure hosted origins and private development servers', () => {
    for (const address of [
      'https://fittrack.example.com',
      'https://fittrack.example.com:8443/',
      'http://192.168.0.6:4000',
      'http://10.0.2.2:4000',
      'http://172.16.0.1:4000',
      'http://localhost:4000',
    ])
      expect(validServerUrl(address)).toBe(true);
  });
  it('rejects insecure public servers, embedded credentials and ambiguous paths', () => {
    for (const address of [
      'http://example.com',
      'http://172.32.0.1',
      'https://user:password@example.com',
      'https://example.com/api',
      'https://example.com?redirect=x',
      'https://example.com/#fragment',
      'file:///tmp',
      'javascript:alert(1)',
      'not a URL',
    ])
      expect(validServerUrl(address)).toBe(false);
  });
});
