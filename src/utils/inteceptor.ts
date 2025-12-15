import { Request, Response, NextFunction } from "express";
import logger from "./logging";

export function apiInterceptor() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    const requestBody = req.body || {};

    // Log incoming request
    logger.info("API Request", {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: requestBody,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Wrap res.send to intercept the response
    const originalSend = res.send.bind(res);

    res.send = function (...args: Parameters<Response["send"]>): Response {
      const duration = Date.now() - startTime;
      const responseBody = args[0];

      // Log outgoing response
      logger.info("API Response", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        responseBody,
      });

      return originalSend(...args);
    };

    next();
  };
}
