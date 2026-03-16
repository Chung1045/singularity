class ServiceError extends Error {
    constructor(service, method, message, cause = null) {
        super(`[${service}:${method}] ${message}`);
        this.name = 'ServiceError';
        this.service = service;
        this.method = method;
        this.cause = cause;
    }
}

module.exports = ServiceError;