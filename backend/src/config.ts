import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Backend configuration that reads and validates environment variables.
 * This module ensures all required environment variables are present
 * before the application starts.
 */

const requiredEnvVars: { name: string; value: string | undefined }[] = [
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
    { name: 'NEXT_PUBLIC_API_URL', value: process.env.NEXT_PUBLIC_API_URL },
    { name: 'SOCKET_PORT', value: process.env.SOCKET_PORT },
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter((envVar) => !envVar.value);
if (missingVars.length > 0) {
    const missingNames = missingVars.map((v) => v.name).join(', ');
    throw new Error(
        `Missing required environment variables: ${missingNames}. Please check your .env file.`
    );
}

export const config = {
    // Database
    databaseUrl: process.env.DATABASE_URL!,

    // Authentication
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // API
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    port: parseInt(process.env.PORT || '4000', 10),

    // Socket
    socketPort: parseInt(process.env.SOCKET_PORT || '4001', 10),

    // Feature Flags
    mockPaymentsEnabled: process.env.MOCK_PAYMENT_ENABLED !== 'false',

    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
};

export default config;