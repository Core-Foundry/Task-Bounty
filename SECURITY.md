# Security Policy

TaskBounty takes security issues seriously. If you discover a vulnerability in the smart contracts, frontend, or supporting tooling, please report it privately so maintainers can investigate and coordinate a fix before public disclosure.

## Supported Versions

The project is still evolving quickly, so security fixes are currently focused on the default branch and the latest release line.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest tagged release | Yes |
| Older tags and unmaintained forks | No |

## Reporting a Vulnerability

Please do not open a public GitHub issue for an unpatched security bug.

Instead, send a private report to the maintainers with:

- a short summary of the issue and affected area
- clear reproduction steps or a proof of concept
- expected impact, including whether funds, identities, or contract state could be affected
- any suggested mitigation or patch direction, if you have one
- your preferred contact details for follow-up

Use GitHub Security Advisories if enabled for the repository. If advisories are not available, open a private channel with the maintainers before sharing exploit details.

## Response Expectations

TaskBounty maintainers aim to:

- acknowledge new reports within 3 business days
- provide a status update within 7 business days
- work with the reporter on validation, severity, and remediation timing
- publish a coordinated disclosure after a fix is available or compensating controls are in place

Response times may be longer for low-severity reports or during major release work, but maintainers should still acknowledge receipt and share next steps.

## Coordinated Disclosure

Please give maintainers reasonable time to investigate and release a fix before publicly disclosing a vulnerability. If the issue affects on-chain assets or live deployments, coordinated disclosure is especially important because remediation may require both code and operational changes.

## Security Scope

Security reports are especially valuable when they involve:

- incorrect payout, escrow, or refund flows in the Soroban contracts
- authorization or role bypasses
- unsafe assumptions around deadlines, disputes, or submission approval
- wallet integration or transaction-signing issues
- secrets exposure, dependency compromise, or deployment misconfiguration

Reports that only cover style issues, non-actionable best-practice notes, or unsupported third-party forks may be closed without a formal security response.
