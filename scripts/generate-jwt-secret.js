#!/usr/bin/env node
// Run: node scripts/generate-jwt-secret.js
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
