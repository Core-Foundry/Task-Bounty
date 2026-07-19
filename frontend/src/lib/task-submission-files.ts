const MEBIBYTE = 1024 * 1024;

export const MAX_TASK_SUBMISSION_FILES = 5;
export const MAX_TASK_SUBMISSION_FILE_SIZE_BYTES = 10 * MEBIBYTE;
export const MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES = 25 * MEBIBYTE;
export const MAX_TASK_SUBMISSION_FILENAME_LENGTH = 120;

// Helper to format file size in MB
export function formatFileSize(bytes: number): string {
  return `${(bytes / MEBIBYTE).toFixed(0)} MB`;
}

const DANGEROUS_FILE_EXTENSIONS = new Set([
  "apk",
  "app",
  "bat",
  "bin",
  "cmd",
  "com",
  "cpl",
  "dll",
  "dmg",
  "exe",
  "gadget",
  "hta",
  "jar",
  "js",
  "jse",
  "lib",
  "lnk",
  "mjs",
  "msi",
  "msp",
  "pif",
  "ps1",
  "scr",
  "sh",
  "so",
  "sys",
  "ts",
  "tsx",
  "vb",
  "vbe",
  "vbs",
  "ws",
  "wsc",
  "wsf",
  "wsh",
]);

const FILE_KIND_CONFIG = {
  pdf: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    binary: true,
  },
  zip: {
    extensions: ["zip"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "multipart/x-zip",
      "application/octet-stream",
    ],
    binary: true,
  },
  png: {
    extensions: ["png"],
    mimeTypes: ["image/png"],
    binary: true,
  },
  jpg: {
    extensions: ["jpg", "jpeg"],
    mimeTypes: ["image/jpeg"],
    binary: true,
  },
  webp: {
    extensions: ["webp"],
    mimeTypes: ["image/webp"],
    binary: true,
  },
  txt: {
    extensions: ["txt"],
    mimeTypes: ["text/plain", "application/octet-stream"],
    binary: false,
  },
  md: {
    extensions: ["md", "markdown"],
    mimeTypes: ["text/markdown", "text/plain", "application/octet-stream"],
    binary: false,
  },
  json: {
    extensions: ["json"],
    mimeTypes: ["application/json", "text/json", "text/plain", "application/octet-stream"],
    binary: false,
  },
} as const;

export type TaskSubmissionFileKind = keyof typeof FILE_KIND_CONFIG;

export interface ValidatedTaskSubmissionFile {
  name: string;
  size: number;
  extension: string;
  kind: TaskSubmissionFileKind;
  providedMimeType: string;
  detectedMimeType: string;
}

export interface TaskSubmissionValidationSuccess {
  ok: true;
  files: ValidatedTaskSubmissionFile[];
  totalSize: number;
}

export interface TaskSubmissionValidationFailure {
  ok: false;
  status: 400 | 413;
  errors: string[];
}

export type TaskSubmissionValidationResult =
  | TaskSubmissionValidationSuccess
  | TaskSubmissionValidationFailure;

const ALLOWED_EXTENSIONS = new Set<string>(
  Object.values(FILE_KIND_CONFIG).flatMap((config) => config.extensions),
);

const EXTENSION_TO_KIND = new Map<string, TaskSubmissionFileKind>(
  Object.entries(FILE_KIND_CONFIG).flatMap(([kind, config]) =>
    config.extensions.map((extension) => [extension, kind as TaskSubmissionFileKind]),
  ),
);

const MIME_TYPE_TO_KIND = new Map<string, TaskSubmissionFileKind[]>(
  Object.entries(FILE_KIND_CONFIG).reduce<Array<[string, TaskSubmissionFileKind[]]>>(
    (entries, [kind, config]) => {
      for (const mimeType of config.mimeTypes) {
        const existing = entries.find(([value]) => value === mimeType);

        if (existing) {
          existing[1].push(kind as TaskSubmissionFileKind);
          continue;
        }

        entries.push([mimeType, [kind as TaskSubmissionFileKind]]);
      }

      return entries;
    },
    [],
  ),
);

function startsWithSignature(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function sniffBinaryKind(bytes: Uint8Array): TaskSubmissionFileKind | null {
  if (startsWithSignature(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "pdf";
  }

  if (startsWithSignature(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }

  if (startsWithSignature(bytes, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  if (
    startsWithSignature(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWithSignature(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWithSignature(bytes, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return "zip";
  }

  return null;
}

function isProbablyUtf8Text(bytes: Uint8Array) {
  if (bytes.length === 0) {
    return false;
  }

  for (const byte of bytes) {
    if (byte === 0x00) {
      return false;
    }
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const sample = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 4096)));

    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(sample);
  } catch {
    return false;
  }
}

function getFileExtension(name: string) {
  const segments = name.split(".");

  if (segments.length < 2) {
    return "";
  }

  return segments.at(-1)?.toLowerCase() ?? "";
}

function getEmbeddedExtensions(name: string) {
  const segments = name.toLowerCase().split(".");

  if (segments.length <= 2) {
    return [];
  }

  return segments.slice(1, -1);
}

function toCanonicalMimeType(kind: TaskSubmissionFileKind) {
  return FILE_KIND_CONFIG[kind].mimeTypes[0];
}

function normalizeMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase();
}

function validateFilename(name: string) {
  const errors: string[] = [];
  const normalized = name.normalize("NFKC").trim();

  if (!normalized) {
    errors.push("Please provide a file name.");
    return errors;
  }

  if (normalized.length > MAX_TASK_SUBMISSION_FILENAME_LENGTH) {
    errors.push(
      `File name is too long. Keep it under ${MAX_TASK_SUBMISSION_FILENAME_LENGTH} characters.`,
    );
  }

  if (/^[.]/.test(normalized)) {
    errors.push("Hidden files are not allowed. Please choose a different file.");
  }

  if (/[\\/]/.test(normalized) || normalized.includes("..")) {
    errors.push("File name contains invalid characters. Please rename your file.");
  }

  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    errors.push("File name contains invalid characters. Please rename your file.");
  }

  const extension = getFileExtension(normalized);

  if (!extension) {
    errors.push("File must have an extension (e.g., .pdf, .zip). Please rename your file.");
    return errors;
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    errors.push(`File type .${extension} isn't allowed. Use PDF, ZIP, images, or text files.`);
  }

  const embeddedDangerousExtension = getEmbeddedExtensions(normalized).find((value) =>
    DANGEROUS_FILE_EXTENSIONS.has(value),
  );

  if (embeddedDangerousExtension) {
    errors.push("File contains blocked extensions. Please choose a different file.");
  }

  if (DANGEROUS_FILE_EXTENSIONS.has(extension)) {
    errors.push("This file type is blocked for security reasons. Please choose a different file.");
  }

  return errors;
}

async function validateFile(file: File): Promise<TaskSubmissionValidationResult> {
  const filenameErrors = validateFilename(file.name);

  if (filenameErrors.length > 0) {
    return { ok: false, status: 400, errors: filenameErrors };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      status: 400,
      errors: ["This file is empty. Please upload a valid file."],
    };
  }

  if (file.size > MAX_TASK_SUBMISSION_FILE_SIZE_BYTES) {
    return {
      ok: false,
      status: 413,
      errors: [
        `File is too large. Max size: ${formatFileSize(MAX_TASK_SUBMISSION_FILE_SIZE_BYTES)}.`,
      ],
    };
  }

  const extension = getFileExtension(file.name);
  const expectedKind = EXTENSION_TO_KIND.get(extension);

  if (!expectedKind) {
    return {
      ok: false,
      status: 400,
      errors: ["File type isn't supported. Please use PDF, ZIP, images, or text files."],
    };
  }

  const providedMimeType = normalizeMimeType(file.type);

  if (providedMimeType) {
    const allowedKinds = MIME_TYPE_TO_KIND.get(providedMimeType);

    if (!allowedKinds?.includes(expectedKind)) {
      return {
        ok: false,
        status: 400,
        errors: ["File type doesn't match its content. Please check your file."],
      };
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffedBinaryKind = sniffBinaryKind(bytes);
  const detectedKind = sniffedBinaryKind ?? (isProbablyUtf8Text(bytes) ? expectedKind : null);

  if (!detectedKind) {
    return {
      ok: false,
      status: 400,
      errors: ["File content isn't a supported format. Please check your file."],
    };
  }

  if (detectedKind !== expectedKind) {
    return {
      ok: false,
      status: 400,
      errors: ["File content doesn't match its extension. Please check your file."],
    };
  }

  return {
    ok: true,
    files: [
      {
        name: file.name.normalize("NFKC").trim(),
        size: file.size,
        extension,
        kind: detectedKind,
        providedMimeType,
        detectedMimeType: toCanonicalMimeType(detectedKind),
      },
    ],
    totalSize: file.size,
  };
}

export function extractTaskSubmissionFiles(formData: FormData) {
  const files: File[] = [];

  for (const value of formData.values()) {
    if (value instanceof File && value.name) {
      files.push(value);
    }
  }

  return files;
}

export async function validateTaskSubmissionFiles(
  files: readonly File[],
): Promise<TaskSubmissionValidationResult> {
  if (files.length === 0) {
    return {
      ok: false,
      status: 400,
      errors: ["Please select at least one file to upload."],
    };
  }

  if (files.length > MAX_TASK_SUBMISSION_FILES) {
    return {
      ok: false,
      status: 413,
      errors: [
        `Too many files. Max: ${MAX_TASK_SUBMISSION_FILES} files per upload.`,
      ],
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES) {
    return {
      ok: false,
      status: 413,
      errors: [
        `Total file size too large. Max combined size: ${formatFileSize(MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES)}.`,
      ],
    };
  }

  const validatedFiles: ValidatedTaskSubmissionFile[] = [];

  for (const file of files) {
    const result = await validateFile(file);

    if (!result.ok) {
      return result;
    }

    validatedFiles.push(...result.files);
  }

  return {
    ok: true,
    files: validatedFiles,
    totalSize,
  };
}
