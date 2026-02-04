const dbService = require("./accountDBService");
const fss = require("./fsServices");
const {serverLogger} = require("./loggingService");

module.exports = async function startupChecks() {
    try {
        await dbService.testConnection();
        serverLogger.info("Database connection OK.");

        await fss.testConnection(process.env.MINIO_BUCKET);
        serverLogger.info("MinIO connection OK.");

        if (!process.env.XAI_API_KEY) {
            serverLogger.warn("WARNING: XAI_API_KEY environment variable is not set!")
            serverLogger.warn("AI chat functionality will not work without a valid API key.")
            serverLogger.warn("Please set XAI_API_KEY in your .env file.")
            throw new Error()
        } else {
            serverLogger.info("XAI API Key found.");
        }

    } catch (err) {
        serverLogger.warn("Unable to start the server. Make sure the database and MinIO are running, and the XAI_API_KEY is set correctly.");
        console.error(err);
        process.exit(1);
    }
};
