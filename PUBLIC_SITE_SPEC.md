# Public Website and Product Landing Page Specification

**Priority:** useful for public beta/product adoption; it must not delay the secure bot/dashboard foundation unless public signups are part of the launch strategy.

## 1. Job and audience

The website explains the platform to gaming server owners, tournament organizers and esports communities, demonstrates product value, builds trust and guides a visitor toward one primary action: **Add to Discord** or, if installation is not open yet, **Join the waitlist**. Do not make both actions visually equal on the same page.

## 2. Page structure

1. Header with product identity, product/docs links and one CTA.
2. Hero: clear audience + outcome; screenshot/product preview that reflects the real dashboard/bot rather than fabricated interface claims.
3. Capability groups: server safety/operations, announcements/community, registration and tournaments, customizable dashboard.
4. How it works: invite bot → configure server → publish workflows → run events.
5. Interactive proof or product screenshots with captions that explain outcomes.
6. Security/trust section explaining least privilege, tenant data separation and permission transparency only after those controls exist.
7. FAQ covering Discord permissions/intents, setup, privacy, supported games/formats, availability and limitations.
8. Final CTA and concise footer with documentation, support, privacy, terms and status links where available.

The landing page is not the authenticated dashboard and should not inherit its dense navigation. Every section must support visitor understanding or conversion; omit any section without a user/customer proof purpose.

## 3. Copy rules

- Speak concretely to the server owner/operator problem and explain what happens after clicking.
- No unverified claims such as "100% raid-proof," "all games supported," "zero downtime," "enterprise-grade" or "replaces every bot".
- State availability accurately (private beta, waitlist, public invite) and maintain realistic product screenshots.
- Use one primary action, with secondary links visually subordinate.
- Define technical terms at first mention. Use evidence and specifics instead of unsupported superlatives.

## 4. Visual/art direction

Use a coherent brand direction tied to the product identity, not a generated SaaS template. The product is gaming/esports but serves administrators: balance competitive energy with professional clarity. Avoid generic neon-purple gradients, glowing cards, random 3D assets and fake dashboard metrics unless a documented art direction makes them meaningful. Use real screenshots or purposeful custom artwork; protect any server/player data shown in demo assets.

## 5. Performance and accessibility

- Responsive from narrow screens to large desktops; content drives breakpoints.
- Optimize hero media, responsive images, font loading and below-the-fold assets.
- Avoid full-viewport video or animation that prevents the primary CTA from being visible quickly.
- Respect reduced motion and avoid heavy background canvas/WebGL on ordinary marketing pages unless a measured value justifies it.
- Semantic landmarks/headings, meaningful link text, keyboard reachability, visible focus, contrast and WCAG 2.2 AA target.
- No interstitial that blocks the product CTA; no forced autoplay audio.

## 6. Analytics and privacy

Measure landing visits, CTA clicks, install starts and completed setup where consent/privacy policy permits. Use privacy-aware analytics and documented retention. Never count a click as a successful install or activation. Consent, cookies and tracking must reflect the actual jurisdictions and policies after legal review.

## 7. Acceptance

- Visitor can explain product value, supported high-level jobs, permissions posture and next step after one scan.
- Primary CTA leads to an active and correct OAuth/invite/waitlist flow.
- Claims are verified against current shipped features.
- Real browser screenshots reviewed at mobile, tablet and desktop widths.
- Core Web Vitals and asset sizes measured against a launch target set by the team; no hard targets are invented without device/network baseline.
