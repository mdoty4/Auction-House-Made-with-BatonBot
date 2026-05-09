/**
 * Shared configuration constants for the Auction House application.
 * These values are used across both frontend and backend.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

export const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws')
    : 'ws://localhost:4000';

export const SOCKET_PORT = process.env.SOCKET_PORT || '4001';

export const FEATURE_FLAGS = {
    mockPayments: process.env.MOCK_PAYMENT_ENABLED !== 'false',
};

export const CONFIG = {
    API_URL,
    SOCKET_URL,
    SOCKET_PORT,
    FEATURE_FLAGS,
};