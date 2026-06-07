# AppSec Code Review Exercise — QuickCart

You are reviewing the QuickCart web application (frontend + backend). Your job is to
**find the security vulnerabilities and issues in the code, explain why each is a problem,
and propose fixes — both local (patch this instance) and systemic (prevent the whole class).**

## How to run this as a realistic mock
1. Set a timer for **40 minutes**.
2. Review the code in `backend/` and `public/`. (Running the app is optional.)
3. For each finding, write down:
   - **What & where** (file:line)
   - **Why it matters** (impact + how it's exploited — the attack chain)
   - **Severity** (Critical / High / Medium / Low, with a one-line justification)
   - **Local fix**
   - **Systemic fix**
4. Then **group findings into themes** and decide what you'd block a release for.
5. Be ready for follow-ups: "How would you exploit this?", "What's the blast radius?",
   "Is this actually reachable?", "What would you check with more time?"

## Scope
Everything under `backend/` and `public/`. There are multiple issues spanning
authentication/authorization, injection, business logic, and data handling, at mixed
severity. There is at least one of each: a Critical, a High, and a lower-severity issue.

When you're done (or stuck), tell me and I'll grade you like a Cursor interviewer.
**Don't open `SOLUTIONS.md` until you've finished** — that's the answer key.
