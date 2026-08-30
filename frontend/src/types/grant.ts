/**
 * Grant records — funding awards tracked alongside tasks.
 *
 * The shape is split deliberately: `GrantRecord` is the full internal record,
 * and only the fields named in `GRANT_EXPORT_FIELDS` (see lib/grant-export.ts)
 * ever leave the system. Anything not on that list — reviewer notes, applicant
 * contact details, internal scoring — stays in.
 */

export type GrantStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "disbursed";

/** The full internal record. Not safe to hand out wholesale. */
export interface GrantRecord {
  id: string;
  title: string;
  /** Stellar G-address the grant pays out to. */
  recipientAddress: string;
  /** Public display name of the recipient. */
  recipientName: string;
  amount: number;
  currency: string;
  status: GrantStatus;
  category: string;
  createdAt: Date;
  updatedAt: Date;

  // ── Restricted: never exported ────────────────────────────────────────────
  /** Applicant's private contact address. */
  applicantEmail?: string;
  /** Free-text reviewer commentary, often candid about the applicant. */
  reviewerNotes?: string;
  /** Internal scoring used to rank applications. */
  internalScore?: number;
  /** Identity/KYC reference held for compliance. */
  kycReference?: string;
  /** Bank details for off-chain disbursement. */
  bankAccountNumber?: string;
}

/** Who is asking to export, and what they are allowed to do. */
export type ExportRole = "admin" | "grant_manager" | "reviewer" | "contributor";

export interface ExportRequester {
  id: string;
  role: ExportRole;
}
