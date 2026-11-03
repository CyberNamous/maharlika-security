'use strict';
const http = require('node:http');
const { createHash, timingSafeEqual } = require('node:crypto');
const { C } = require('../utils/constants');
const digest = value => createHash('sha256').update(value).digest();
function createHealthServer(client, env) {
  const secretHash = env.HEALTHCHECK_TOKEN ? digest(env.HEALTHCHECK_TOKEN) : null;
  const server = http.createServer({ requestTimeout: 5000, headersTimeout: 5000, keepAliveTimeout: 2000, maxHeaderSize: 8192 }, (request, response) => {
    response.setHeader('Content-Type', 'application/json'); response.setHeader('Cache-Control', 'no-store');
    if (request.url !== '/health') { response.writeHead(404); response.end('{"error":"not_found"}'); return; }
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); response.writeHead(405); response.end('{"error":"method_not_allowed"}'); return; }
    const token = request.headers['x-health-token'];
    if (secretHash && (typeof token !== 'string' || !timingSafeEqual(digest(token), secretHash))) { response.writeHead(401); response.end('{"error":"unauthorized"}'); return; }
    // 200 means HTTP process liveness ONLY. Gateway readiness is independent.
    response.writeHead(200); response.end(JSON.stringify({ service: C.SERVICE_NAME, status: 'alive', discordReady: client.isReady() }));
  });
  server.maxConnections = C.HTTP_MAX_CONNECTIONS;
  server.maxRequestsPerSocket = C.HTTP_MAX_REQUESTS_PER_SOCKET;
  return server;
}
module.exports = { createHealthServer };
