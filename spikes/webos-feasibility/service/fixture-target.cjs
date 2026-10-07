'use strict';

const net = require('net');

// This is a developer probe, not a general-purpose localhost/CORS bypass.
// Accept only a private IPv4 fixture host and known paths. Never relay real
// credentials, signed stream URLs, user-supplied headers or response bodies.
function fixtureTarget(value) {
  if (typeof value !== 'string' || value.length > 250) throw new Error('invalid fixture URL');
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.username || url.password || url.search || url.hash) {
    throw new Error('invalid fixture URL');
  }
  if (net.isIP(url.hostname) !== 4) throw new Error('fixture must use a private IPv4 address');
  const octets = url.hostname.split('.').map(Number);
  const privateIPv4 = octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
  if (!privateIPv4 || !url.port || !['/cors', '/no-cors', '/auth', '/redirect'].includes(url.pathname)) {
    throw new Error('fixture URL not permitted');
  }
  return url;
}

module.exports = { fixtureTarget };
