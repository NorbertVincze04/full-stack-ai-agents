import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Invalid JSON body" });
    return;
  }
  // Log the message only: never the request body, password or hash.
  console.error("Unhandled error:", err instanceof Error ? err.message : "unknown error");
  res.status(500).json({ success: false, message: "Internal server error" });
};
