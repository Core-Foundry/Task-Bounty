# Security Policy

## Reporting a Vulnerability

The TaskBounty team takes security seriously. We appreciate your efforts to help us maintain a secure platform and ask that you responsibly disclose any security vulnerabilities you discover.

### How to Report

**Please do not open public GitHub issues for security vulnerabilities.**

Instead, please report security vulnerabilities by emailing: **security@taskbounty.dev**

In your email, please include:
- A clear description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact and severity assessment
- Your contact information (name and email)
- Your GitHub username (optional)

### Responsible Disclosure

We ask that you:
- **Do not** publicly disclose the vulnerability until we've had a chance to address it
- **Do not** attempt to exploit the vulnerability beyond the minimal testing required to confirm it
- **Do not** access data that is not yours or modify other users' data
- Give us a reasonable amount of time (typically 90 days) to patch the vulnerability before public disclosure
- Allow us to credit you in our security advisory (if you choose)

## Response Timeline

| Stage | Timeline |
|-------|----------|
| **Initial Response** | Within 48 hours |
| **Initial Assessment** | Within 1 week |
| **Patch Development** | Varies by severity (see below) |
| **Security Advisory** | Published after patch release or 90 days from report (whichever comes first) |

### Severity-Based Response Times

- **Critical** (auth bypass, fund loss, contract exploit): Fix within 1 week; emergency deployment to mainnet
- **High** (significant data exposure, major functionality bypass): Fix within 2 weeks
- **Medium** (limited impact, requires specific conditions): Fix within 30 days
- **Low** (minimal impact, edge cases): Fix within 90 days

## Supported Versions

We provide security updates for the following versions:

| Version | Release Date | End of Support | Status |
|---------|--------------|-----------------|--------|
| 1.x | TBD | TBD | Active |
| 0.x | TBD | TBD | Security fixes only |

**Security updates** are provided for the latest minor version of each major release. Users are encouraged to upgrade promptly.

## Security Considerations

### Smart Contract Security

- All smart contracts undergo internal security reviews before mainnet deployment
- We recommend independent audits for contracts handling significant value
- Fund safety is ensured through the escrow pattern: contracts hold funds during task lifecycle
- Authorization uses Soroban's built-in `require_auth()` for access control
- No reentrancy vulnerabilities due to Soroban's execution model

### Frontend Security

- HTTP Security Headers (CSP, HSTS, X-Frame-Options) are enforced on all responses
- Input validation on all user-facing forms
- Wallet integration follows Stellar Wallets Kit security best practices
- Environment variables are never exposed in frontend code

### Blockchain-Specific Concerns

- Transactions leverage Stellar's atomicity guarantees
- All token transfers use standardized Stellar Asset Contract (SAC) interface
- Timestamp-based validations prevent time-based attacks

## Known Limitations

- **Testnet is not production-ready**: Do not use testnet for real value transfers
- **Smart contract audits pending**: Mainnet deployment awaits security audit completion
- **Wallet security is user's responsibility**: Users must protect their private keys
- **Network forks**: Users should verify they're on the correct Stellar network (Testnet vs. Mainnet)

## Security Best Practices for Users

1. **Never share private keys** with anyone, including our team
2. **Verify contract addresses** before submitting work or posting tasks
3. **Use hardware wallets** for storing significant funds
4. **Test on testnet first** before large mainnet transactions
5. **Keep your wallet software updated** to the latest version
6. **Enable 2FA** on any associated accounts (Discord, GitHub, etc.)

## Bug Bounty Program

Currently, we do not have a formal bug bounty program. However, we deeply appreciate security researchers who find and report vulnerabilities responsibly. We will:

- Credit you publicly (if you consent) in our security advisories
- Provide acknowledgment in our README or CONTRIBUTING.md
- Consider your contributions when evaluating future bounty programs

## Security Advisories

Past and future security advisories will be published at:
- [GitHub Security Advisories](https://github.com/[org]/task-bounty/security/advisories)
- Email notification for major vulnerabilities (opt-in)

## Audit Reports

Smart contract audits and security assessments will be published when available at:
- `/audit/` directory in this repository
- Project website (TBD)

## Questions or Concerns?

If you have questions about this security policy or our security practices, please reach out to **security@taskbounty.dev**.

---

**Last Updated:** July 2026  
**Policy Version:** 1.0
