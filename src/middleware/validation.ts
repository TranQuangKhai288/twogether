import { Request, Response, NextFunction } from "express";
import validator from "validator";
import { AppError } from "../utils/AppError";

/**
 * Custom validation middleware factory
 */
export const validateBody = (rules: Record<string, any>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const body = req.body;

    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field];

      // Check required fields
      if (rule.required && (!value || value === "")) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is optional and empty
      if (!rule.required && (!value || value === "")) {
        continue;
      }

      // String length validation
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} cannot exceed ${rule.maxLength} characters`);
      }

      // Email validation
      if (rule.isEmail && !validator.isEmail(value)) {
        errors.push(`${field} must be a valid email`);
      }

      // URL validation
      if (rule.isURL && !validator.isURL(value)) {
        errors.push(`${field} must be a valid URL`);
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(", ")}`);
      }

      // Date validation
      if (rule.isDate) {
        const date = new Date(value);

        if (isNaN(date.getTime())) {
          errors.push(`${field} must be a valid date`);
        } else if (rule.notFuture && date > new Date()) {
          errors.push(`${field} cannot be in the future`);
        }
      }

      // Boolean validation
      if (rule.isBoolean && typeof value !== "boolean") {
        errors.push(`${field} must be a boolean`);
      }

      // Custom validation
      if (rule.custom) {
        try {
          rule.custom(value, body);
        } catch (error: any) {
          errors.push(error.message);
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError(errors.join(", "), 400));
    }

    next();
  };
};

/**
 * Validation rules for updating user profile
 */
export const validateUpdateProfile = validateBody({
  name: {
    required: false,
    minLength: 1,
    maxLength: 50,
  },
  gender: {
    required: false,
    enum: ["male", "female", "other"],
  },
  birthday: {
    required: false,
    isDate: true,
    notFuture: true,
  },
  avatarUrl: {
    required: false,
    isURL: true,
  },
});

/**
 * Validation rules for changing password
 */
export const validateChangePassword = validateBody({
  currentPassword: {
    required: true,
  },
  newPassword: {
    required: true,
    minLength: 6,
    // custom: (value: string) => {
    //   if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    //     throw new Error('New password must contain at least one letter and one number');
    //   }
    // }
  },
  confirmPassword: {
    required: true,
    custom: (value: string, body: any) => {
      if (value !== body.newPassword) {
        throw new Error("Confirm password does not match new password");
      }
    },
  },
});

/**
 * Validation rules for updating preferences
 */
export const validateUpdatePreferences = validateBody({
  "preferences.notifications": {
    required: false,
    isBoolean: true,
  },
  "preferences.darkMode": {
    required: false,
    isBoolean: true,
  },
});

/**
 * Validation rules for search users
 */
export const validateSearchUsers = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { q } = req.query;

  if (q && typeof q === "string" && q.trim().length === 0) {
    return next(new AppError("Search term must not be empty", 400));
  }

  next();
};

/**
 * Validation rules for admin user update
 */
export const validateAdminUpdateUser = validateBody({
  name: {
    required: false,
    minLength: 1,
    maxLength: 50,
  },
  gender: {
    required: false,
    enum: ["male", "female", "other"],
  },
  birthday: {
    required: false,
    isDate: true,
    notFuture: true,
  },
  avatarUrl: {
    required: false,
    isURL: true,
  },
  email: {
    custom: () => {
      throw new Error("Email cannot be updated through this endpoint");
    },
  },
  passwordHash: {
    custom: () => {
      throw new Error("Password cannot be updated through this endpoint");
    },
  },
  _id: {
    custom: () => {
      throw new Error("ID cannot be updated");
    },
  },
});

/**
 * Validation rules for joining a couple
 */
export const validateJoinCouple = validateBody({
  inviteCode: {
    required: true,
    minLength: 6,
    maxLength: 12,
    custom: (value: string) => {
      if (!/^[A-Z0-9]+$/.test(value)) {
        throw new Error(
          "Invite code must contain only uppercase letters and numbers"
        );
      }
    },
  },
});

/**
 * Validation rules for updating couple settings
 */
export const validateUpdateCoupleSettings = validateBody({
  settings: {
    required: true,
    isObject: true,
    custom: (value: any) => {
      if (
        value.allowLocationShare !== undefined &&
        typeof value.allowLocationShare !== "boolean"
      ) {
        throw new Error("allowLocationShare must be a boolean");
      }
      if (
        value.theme !== undefined &&
        !["light", "dark", "auto"].includes(value.theme)
      ) {
        throw new Error("theme must be one of: light, dark, auto");
      }
    },
  },
});

/**
 * Validation rules for updating anniversary date
 */
export const validateUpdateAnniversaryDate = validateBody({
  anniversaryDate: {
    required: true,
    isDate: true,
    notFuture: true,
  },
});

/**
 * Validation rules for sending couple invitation
 */
export const validateSendInvitation = validateBody({
  receiverEmail: {
    required: true,
    isEmail: true,
  },
  anniversaryDate: {
    required: true,
    isDate: true,
    notFuture: true,
  },
  message: {
    required: false,
    maxLength: 500,
  },
});
