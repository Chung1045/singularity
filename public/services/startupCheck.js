const dbService = require("./accountDBService");
const fss = require("./fsServices");

module.exports = async function startupChecks() {
    try {
        console.log("Checking database connection...");
        await dbService.testConnection();
        console.log("Database OK.");

        console.log("Checking MinIO connection...");
        await fss.testConnection(process.env.MINIO_BUCKET);
        console.log("MinIO OK.");

        console.log("Checking XAI API Key...");
        if (!process.env.XAI_API_KEY) {
            console.warn("  WARNING: XAI_API_KEY environment variable is not set!");
            console.warn("  AI chat functionality will not work without a valid API key.");
            console.warn("  Please set XAI_API_KEY in your .env file.");
        } else {
            console.log(" XAI API Key found.");
        }

    } catch (err) {
        console.error("Unable to start the server. Make sure the database and MinIO are running.");
        console.error(err);
        process.exit(1);
    }
};
