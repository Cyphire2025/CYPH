// middlewares/validate.js
import { z } from "zod";

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "ValidationError",
      details: result.error?.issues || result.error?.errors || [],
    });
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: "ValidationError",
      details: result.error?.issues || result.error?.errors || [],
    });
  }
  req.query = result.data;
  next();
};
