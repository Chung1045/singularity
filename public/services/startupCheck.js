const dbService = require("./accountDBService");
const fss = require("./fsServices");
const {serverLogger} = require("./loggingService");
const ServiceError = require("../errors/ServiceError");

const SERVICE_NAME = 'StartupService';

async function startupChecks() {
    try {
        await dbService.testConnection();
        serverLogger.info("Database connection OK.");

        await fss.testConnection(process.env.MINIO_BUCKET);
        serverLogger.info("MinIO connection OK.");

        if (!process.env.XAI_API_KEY) {
            throw new ServiceError(SERVICE_NAME, 'startupChecks', 'XAI_API_KEY is not set. AI chat functionality will not work. Please set it in your .env file.');
        }

        serverLogger.info("XAI API Key found.");
    } catch (err) {
        if (err instanceof ServiceError) {
            // Known startup config issue
            serverLogger.error(`Startup check failed: ${err.message}`);
        } else {
            // Unknown error from db/minio/etc
            serverLogger.error(`Startup check failed: ${err.message || err}`);
        }

        process.exit(1);
    }
}

module.exports = {
    startupChecks
}
