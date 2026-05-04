# Security Policy

FitQuest is a small, solo-maintained open-source project. We take security seriously and appreciate responsible disclosure of any vulnerabilities you discover.

## Reporting a Vulnerability

**Please report security issues privately**, not via public GitHub issues.

Preferred channel: GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) — open the **Security** tab on this repository and click **Report a vulnerability**.

When reporting, include:

- A clear description of the issue and the affected component
- Steps to reproduce (proof-of-concept code or screenshots welcome)
- The potential impact you have identified
- Any suggested mitigation, if you have one

## Scope

**In scope:**

- The FitQuest application code in this repository (`src/`, `firestore.rules`, build/CI configuration)
- Authentication and authorization logic, including Firestore security rules
- Client-side handling of user data and session state

**Out of scope:**

- Vulnerabilities in Firebase, Next.js, or other upstream dependencies — please report those to the respective project maintainers. We will pick up fixes via Dependabot once they are released.
- Issues that require physical access to a victim's unlocked device
- Social engineering attacks against the maintainer or users
- Denial-of-service attacks against the live Firebase project
- Reports generated solely by automated scanners without a demonstrated exploit

## Response Expectations

This project is maintained by a single developer in their spare time. We aim to:

- Acknowledge new reports within **7 days**
- Provide an initial assessment within **14 days**
- Coordinate a fix and disclosure timeline once severity is confirmed

We may not be able to meet these targets every time, but we will communicate honestly if a report needs longer.

## Safe Harbor

Good-faith security research is welcome. We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption
- Do not access, modify, or exfiltrate other users' data beyond the minimum needed to demonstrate the issue
- Do not perform denial-of-service testing against production systems
- Give us a reasonable opportunity to respond before any public disclosure

Thank you for helping keep FitQuest and its players safe.
