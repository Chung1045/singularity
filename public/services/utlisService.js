const UAParser = require("ua-parser-js");

async function getClientDeviceInfo(req){
    const parser = new UAParser(req.headers['user-agent']);
    const uaResult = parser.getResult();

    const ip =
        req.headers['x-forwarded-for']?.split(',').shift() ||
        req.socket?.remoteAddress;

    const osName = uaResult.os.name || 'Unknown';
    const osVersion = uaResult.os.version || '';
    const browserName = uaResult.browser.name || 'Unknown';
    const browserVersion = uaResult.browser.version || '';

    // Handle cases where it's a tool like curl
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const isCurl = userAgent.toLowerCase().includes('curl');
    const isPostman = userAgent.toLowerCase().includes('postman');

    return {
        clientOS: osName !== 'Unknown' ? `${osName} ${osVersion}`.trim() : 'Unknown',
        clientBrowser: browserName !== 'Unknown' ? `${browserName} ${browserVersion}`.trim() : userAgent,
        clientIP: ip,
        isCurlOrAPI: isCurl || isPostman
    }
}

module.exports = {
    getClientDeviceInfo
}
