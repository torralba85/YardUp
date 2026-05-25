# YardUp Privacy Policy

Effective date: 2026-05-24

YardUp (operated under the legal name ADU Advisor) helps homeowners estimate accessory dwelling unit feasibility and connect with builders. The app stores project studies locally on the device by default and only sends data to backend services when the user initiates a cloud-backed action.

## Data stored on device

The app may store property addresses, project names, ADU estimate assumptions, selected ADU models, design preferences, saved references, site photo references, property record notes, generated concept text, and quote packet status in local SQLite storage on the device. Removing the app from the device removes this data.

## Data sent to backend services

When a user starts a cloud-backed action, YardUp may send the minimum data needed for that action to Firebase Cloud Functions hosted in the `yardup-2026` project. Examples:

- Jurisdiction identifier for regulation guidance
- Project constraints and selected model information for design concept generation
- Property address for property history lookup
- Contractor identifier and packet items for quote requests
- Free-text message, originating surface, and optional project identifier for product feedback

## AI processing

Design concept generation can use a server-side Gemini integration. Exact address text and site photo binaries are not included in AI prompts. Prompts focus on project constraints, selected model information, style preferences, and fit signals.

## Site photos

Site photos selected or captured by the user remain on the device in the React Native client. The backend receives only whether a site photo exists, not the binary itself.

## Product feedback

When a user submits feedback through the in-app feedback control, the message text, the screen it was sent from, and an optional project identifier are written to Firestore under the user's anonymous Firebase account. Feedback submission is rate-limited per user. Feedback is used to improve the product and may be reviewed by the YardUp team. Do not include personal identifiers, sensitive information, or third-party data in feedback messages.

## Service logs

Backend service logs may record service name, project identifier, jurisdiction, status, and a one-way hash of an address for abuse prevention and reliability. Raw addresses are not stored in service logs.

## Sharing

YardUp does not sell user data. Backend providers (Firebase, Gemini when configured) are used only to operate the app features described in this policy.

## Children

YardUp is intended for adult homeowners and prospective ADU buyers and is not directed at children under 13.

## Contact and deletion

For support, bug reports, or deletion of cloud-backed records associated with your anonymous Firebase account, contact support@aduadvisor.app. Local-only project data can be deleted by removing the app from the device.

## Changes to this policy

Material changes to this policy will update the effective date above. Continued use of the app after a change indicates acceptance of the updated policy.
