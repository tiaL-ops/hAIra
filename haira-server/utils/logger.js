// Centralized logging and monitoring utilities

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Simple structured logger
 */
export class Logger {
  constructor(context = 'App') {
    this.context = context;
  }
  
  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(data && { data })
    };
    
    const formatted = `[${timestamp}] [${level}] [${this.context}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted, data || '');
        break;
      case LogLevel.WARN:
        console.warn(formatted, data || '');
        break;
      case LogLevel.DEBUG:
        if (process.env.DEBUG === 'true') {
          console.debug(formatted, data || '');
        }
        break;
      default:
        console.log(formatted, data || '');
    }
    
    return logEntry;
  }
  
  debug(message, data) {
    return this._log(LogLevel.DEBUG, message, data);
  }
  
  info(message, data) {
    return this._log(LogLevel.INFO, message, data);
  }
  
  warn(message, data) {
    return this._log(LogLevel.WARN, message, data);
  }
  
  error(message, data) {
    return this._log(LogLevel.ERROR, message, data);
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
  }
  
  end() {
    const duration = Date.now() - this.startTime;
    console.log(`[Performance] ${this.name} took ${duration}ms`);
    return duration;
  }
}

/**
 * Request logging middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const logger = new Logger('HTTP');
  
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    userId: req.user?.uid,
    ip: req.ip
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
}

/**
 * Error tracking
 */
export class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }
  
  track(error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context
    };
    
    this.errors.push(errorEntry);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    console.error('[ErrorTracker]', errorEntry);
    return errorEntry;
  }
  
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }
  
  clear() {
    this.errors = [];
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  errorTracker.track(err, {
    method: req.method,
    path: req.path,
    userId: req.user?.uid
  });
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}
