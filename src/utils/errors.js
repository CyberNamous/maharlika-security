'use strict';
class PublicError extends Error { constructor(message) { super(message); this.name = 'PublicError'; } }
module.exports = { PublicError };
