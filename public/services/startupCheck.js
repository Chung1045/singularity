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

    } catch (err) {
        console.error("Unable to start the server. Make sure the database and MinIO are running.");
        console.error(err);
        process.exit(1);
    }
};
