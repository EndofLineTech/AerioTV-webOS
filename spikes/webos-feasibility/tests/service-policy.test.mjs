import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureTarget } from '../service/fixture-target.cjs';

test('service admits only LAN fixture endpoints, never arbitrary remote URLs', () => {
  assert.equal(fixtureTarget('http://192.168.1.10:8088/auth').hostname, '192.168.1.10');
  assert.equal(fixtureTarget('http://10.2.3.4:8088/cors').pathname, '/cors');
  for (const url of [
    'https://public.example/auth', 'http://127.0.0.1:8088/auth',
    'file:///etc/passwd', 'http://192.168.1.10:8088/private',
    'http://192.168.1.10:8088/auth?token=real-secret',
    'http://user:pass@192.168.1.10:8088/auth',
    'http://169.254.1.1:8088/auth',
  ]) assert.throws(() => fixtureTarget(url), url);
});
