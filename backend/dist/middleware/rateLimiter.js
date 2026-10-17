"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const env_js_1 = require("../config/env.js");
const ipMap = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const windowMs = env_js_1.env.API_RATE_LIMIT_WINDOW_MS;
    const maxRequests = env_js_1.env.API_RATE_LIMIT_MAX_REQUESTS;
    let entry = ipMap.get(ip);
    if (!entry || now > entry.resetTime) {
        entry = { count: 1, resetTime: now + windowMs };
        ipMap.set(ip, entry);
    }
    else {
        entry.count += 1;
    }
    if (entry.count > maxRequests) {
        res.status(429).json({
            success: false,
            data: null,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please slow down and try again shortly.',
            },
        });
        return;
    }
    next();
};
exports.rateLimiter = rateLimiter;
