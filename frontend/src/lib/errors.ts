
/**
 * Standardized error types for the frontend
 */

// Error severity levels
export type ErrorSeverity = "error" | "warning" | "info";

// Standard error interface
export interface StandardError {
  code: string;
  message: string;
  details?: string[];
  severity?: ErrorSeverity;
}

// Error codes
export const ErrorCodes = {
  // Wallet errors
  WALLET_NOT_CONNECTED: "WALLET_NOT_CONNECTED",
  WALLET_CONNECTION_FAILED: "WALLET_CONNECTION_FAILED",
  WALLET_DISCONNECT_FAILED: "WALLET_DISCONNECT_FAILED",
  WALLET_KIT_NOT_INITIALIZED: "WALLET_KIT_NOT_INITIALIZED",
  
  // Stellar/Horizon errors
  STELLAR_ACCOUNT_NOT_FOUND: "STELLAR_ACCOUNT_NOT_FOUND",
  STELLAR_FETCH_FAILED: "STELLAR_FETCH_FAILED",
  STELLAR_BALANCE_NOT_FOUND: "STELLAR_BALANCE_NOT_FOUND",
  
  // File validation errors
  FILE_EMPTY: "FILE_EMPTY",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_EXTENSION_INVALID: "FILE_EXTENSION_INVALID",
  FILE_MIME_TYPE_MISMATCH: "FILE_MIME_TYPE_MISMATCH",
  FILE_CONTENT_INVALID: "FILE_CONTENT_INVALID",
  FILE_NAME_INVALID: "FILE_NAME_INVALID",
  FILE_NAME_TOO_LONG: "FILE_NAME_TOO_LONG",
  FILE_HIDDEN: "FILE_HIDDEN",
  FILE_PATH_SEQUENCE_INVALID: "FILE_PATH_SEQUENCE_INVALID",
  FILE_CONTROL_CHARS: "FILE_CONTROL_CHARS",
  FILE_NO_EXTENSION: "FILE_NO_EXTENSION",
  FILE_EMBEDDED_EXTENSION_BLOCKED: "FILE_EMBEDDED_EXTENSION_BLOCKED",
  FILE_EXTENSION_BLOCKED: "FILE_EXTENSION_BLOCKED",
  FILES_TOO_MANY: "FILES_TOO_MANY",
  FILES_TOTAL_SIZE_TOO_LARGE: "FILES_TOTAL_SIZE_TOO_LARGE",
  FILES_NONE: "FILES_NONE",
  
  // Form/API errors
  API_REQUEST_FAILED: "API_REQUEST_FAILED",
  INVALID_FORM_DATA: "INVALID_FORM_DATA",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// User-friendly error messages
export const ErrorMessages: Record<string, string> = {
  // Wallet errors
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue.",
  WALLET_CONNECTION_FAILED: "Failed to connect wallet. Please try again.",
  WALLET_DISCONNECT_FAILED: "Failed to disconnect wallet. Please try again.",
  WALLET_KIT_NOT_INITIALIZED: "Wallet service is not available. Please refresh the page.",
  
  // Stellar/Horizon errors
  STELLAR_ACCOUNT_NOT_FOUND: "Stellar account not found. Please check your public key.",
  STELLAR_FETCH_FAILED: "Failed to fetch account details from Stellar network. Please try again later.",
  STELLAR_BALANCE_NOT_FOUND: "Could not find native balance for this account.",
  
  // File validation errors
  FILE_EMPTY: "File is empty. Please upload a valid file.",
  FILE_TOO_LARGE: "File exceeds size limit. Please upload a smaller file.",
  FILE_EXTENSION_INVALID: "File type not allowed. Please use a supported format.",
  FILE_MIME_TYPE_MISMATCH: "File content doesn't match its type. Please check your file.",
  FILE_CONTENT_INVALID: "File content is not in a supported format. Please check your file.",
  FILE_NAME_INVALID: "Invalid file name. Please rename your file.",
  FILE_NAME_TOO_LONG: "File name is too long. Please use a shorter name.",
  FILE_HIDDEN: "Hidden files are not allowed. Please rename your file.",
  FILE_PATH_SEQUENCE_INVALID: "File name contains invalid characters. Please rename your file.",
  FILE_CONTROL_CHARS: "File name contains invalid characters. Please rename your file.",
  FILE_NO_EXTENSION: "File must have an extension. Please rename your file.",
  FILE_EMBEDDED_EXTENSION_BLOCKED: "File contains blocked extensions. Please check your file.",
  FILE_EXTENSION_BLOCKED: "File type is blocked for security reasons.",
  FILES_TOO_MANY: "Too many files. Please upload fewer files.",
  FILES_TOTAL_SIZE_TOO_LARGE: "Total file size exceeds limit. Please reduce the size of your upload.",
  FILES_NONE: "Please select at least one file to upload.",
  
  // Form/API errors
  API_REQUEST_FAILED: "Something went wrong. Please try again later.",
  INVALID_FORM_DATA: "Please check your form data and try again.",
};

/**
 * Creates a standardized error object
 */
export function createError(
  code: ErrorCode,
  details?: string[],
  severity: ErrorSeverity = "error",
): StandardError {
  return {
    code,
    message: ErrorMessages[code],
    details,
    severity,
  };
}

/**
 * Formats an unknown error into a standard error
 */
export function formatUnknownError(error: unknown): StandardError {
  if (error instanceof Error) {
    return {
      code: ErrorCodes.API_REQUEST_FAILED,
      message: error.message || ErrorMessages.API_REQUEST_FAILED,
      details: [error.stack || ""].filter(Boolean),
      severity: "error",
    };
  }
  return createError(ErrorCodes.API_REQUEST_FAILED);
}

