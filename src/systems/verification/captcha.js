'use strict';
const { PublicError } = require('../../utils/errors');
const { randomInt, createHash, timingSafeEqual } = require('node:crypto');
const { C } = require('../../utils/constants');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function normalize(value) { return typeof value === 'string' ? value.trim().toUpperCase() : ''; }
function generate(length = C.CAPTCHA_LENGTH) {
  if (!Number.isInteger(length) || length < 1 || length > 16) throw new PublicError('Invalid CAPTCHA length');
  let answer = ''; for (let n = 0; n < length; n++) answer += ALPHABET[randomInt(ALPHABET.length)];
  return answer;
}
const digest = value => createHash('sha256').update(normalize(value)).digest('hex');
function matches(input, hash) {
  if (typeof input !== 'string' || input.length > 100 || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(digest(input), 'hex'), Buffer.from(hash, 'hex'));
}
module.exports = { ALPHABET, normalize, generate, digest, matches };
