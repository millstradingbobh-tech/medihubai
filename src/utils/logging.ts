export default class Logger {
  static log(level: string, message: any, meta = {}) {
    const logEntry = {
      severity: level.toUpperCase(),    // GCP uses "severity"
      message,
      time: new Date().toISOString(),
      ...meta
    };

    console.log(JSON.stringify(logEntry));
  }

  static info(message: any = {}, meta: any = {}) {
    this.log("INFO", message, meta);
  }

  static warn(message: any = {}, meta: any = {}) {
    this.log("WARNING", message, meta);
  }

  static error(message: any, meta: any = {}) {
    this.log("ERROR", message, meta);
  }

  static debug(message: any, meta: any = {}) {
    this.log("DEBUG", message, meta);
  }
}
