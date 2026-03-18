/**
 * Sensitive data detection engine.
 * Classifies variables by sensitivity level using key/value pattern matching.
 */

import type { SensitivityLevel } from "@/types/pipeline-debug";

const HIGH_SENSITIVITY_KEY_PATTERNS = [
  /token/i,
  /password/i,
  /passwd/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /session[_-]?id/i,
  /cookie/i,
  /jwt/i,
  /bearer/i,
  /credential/i,
  /ssn/i,
  /credit[_-]?card/i,
];

const MEDIUM_SENSITIVITY_KEY_PATTERNS = [
  /email/i,
  /phone/i,
  /address/i,
  /ip[_-]?address/i,
  /user[_-]?name/i,
  /login/i,
  /birth/i,
  /dob/i,
];

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const API_KEY_PATTERN = /^(sk|pk|rk|ak|api)[_-][A-Za-z0-9]{20,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s()-]{10,}$/;
const LONG_RANDOM_PATTERN = /^[A-Za-z0-9+/=_-]{32,}$/;

/**
 * Classify a key-value pair by sensitivity level.
 */
export function classifySensitivity(key: string, value: unknown): SensitivityLevel {
  const keyLevel = classifyByKey(key);
  if (keyLevel === "high") return "high";

  const valueLevel = classifyByValue(value);
  if (valueLevel === "high") return "high";

  if (keyLevel === "medium" || valueLevel === "medium") return "medium";

  return "low";
}

function classifyByKey(key: string): SensitivityLevel {
  const lastSegment = key.split(".").pop() ?? key;

  for (const pattern of HIGH_SENSITIVITY_KEY_PATTERNS) {
    if (pattern.test(lastSegment)) return "high";
  }

  for (const pattern of MEDIUM_SENSITIVITY_KEY_PATTERNS) {
    if (pattern.test(lastSegment)) return "medium";
  }

  return "low";
}

function classifyByValue(value: unknown): SensitivityLevel {
  if (typeof value !== "string") return "low";

  if (JWT_PATTERN.test(value)) return "high";
  if (API_KEY_PATTERN.test(value)) return "high";

  if (EMAIL_PATTERN.test(value)) return "medium";
  if (PHONE_PATTERN.test(value)) return "medium";

  if (LONG_RANDOM_PATTERN.test(value) && value.length > 40) return "high";

  return "low";
}

/**
 * Mask a sensitive value for safe display or AI input.
 * e.g., "abc123xyz456" → "abc***456"
 */
export function maskSensitiveValue(value: string): string {
  if (value.length <= 6) return "***";
  const visibleStart = Math.min(3, Math.floor(value.length * 0.15));
  const visibleEnd = Math.min(3, Math.floor(value.length * 0.15));
  return `${value.slice(0, visibleStart)}***${value.slice(-visibleEnd)}`;
}

/**
 * Check if a value appears to be sensitive based on patterns alone.
 */
export function isSensitiveValue(value: unknown): boolean {
  return classifyByValue(value) !== "low";
}
