// logger.js

export function createLogger({ service = 'event-processor', level = 'info' } = {}) {
    const LOG_LEVELS = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  
    const shouldLog = (messageLevel) => {
      return LOG_LEVELS[messageLevel] <= LOG_LEVELS[level];
    };
  
    const formatMessage = (messageLevel, message, meta = {}) => {
      const timestamp = new Date().toISOString();
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} [${service}] ${messageLevel.toUpperCase()}: ${message} ${metaString}`;
    };
  
    return {
      error: (message, meta = {}) => {
        if (shouldLog('error')) {
          console.error(formatMessage('error', message, meta));
        }
      },
      warn: (message, meta = {}) => {
        if (shouldLog('warn')) {
          console.warn(formatMessage('warn', message, meta));
        }
      },
      info: (message, meta = {}) => {
        if (shouldLog('info')) {
          console.info(formatMessage('info', message, meta));
        }
      },
      debug: (message, meta = {}) => {
        if (shouldLog('debug')) {
          console.debug(formatMessage('debug', message, meta));
        }
      }
    };
  }