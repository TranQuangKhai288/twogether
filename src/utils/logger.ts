/**
 * Logger utility with different log levels
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  private output(logEntry: LogEntry): void {
    const { level, message, timestamp, data } = logEntry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (this.isDevelopment) {
      // Colored output for development
      const colors = {
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        debug: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[level]}${prefix}${reset} ${message}`);
      if (data) {
        console.log(`${colors[level]}${prefix}${reset} Data:`, data);
      }
    } else {
      // JSON output for production
      console.log(JSON.stringify(logEntry));
    }
  }

  public info(message: string, data?: any): void {
    this.output(this.formatMessage('info', message, data));
  }

  public warn(message: string, data?: any): void {
    this.output(this.formatMessage('warn', message, data));
  }

  public error(message: string, data?: any): void {
    this.output(this.formatMessage('error', message, data));
  }

  public debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.output(this.formatMessage('debug', message, data));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export the class for testing purposes
export { Logger };