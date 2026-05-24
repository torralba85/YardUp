# ADU Advisor Privacy Policy

Effective date: 2026-05-21

ADU Advisor helps homeowners estimate accessory dwelling unit feasibility. The app stores project studies locally on the device by default.

## Data stored on device

The app may store property addresses, project names, ADU estimate assumptions, selected ADU models, design preferences, saved references, site photo references, property record notes, generated concept text, and quote packet status in local SQLite storage on the device.

## Data sent to backend services

When a user starts a cloud-backed action, ADU Advisor may send the minimum data needed for that action to Firebase Cloud Functions. Examples include jurisdiction IDs for regulation guidance, project constraints for design concept generation, property addresses for property history lookup, and contractor IDs for quote requests.

## AI processing

Design concept generation can use a server-side OpenAI integration. Exact address text and site photo binaries are not included in AI prompts. Prompts focus on project constraints, selected model information, style preferences, and fit signals.

## Site photos

Site photos selected or captured by the user remain on the device in the current release. The backend receives only whether a site photo exists.

## Service logs

Backend service logs may record service name, project ID, jurisdiction, status, and a one-way hash of an address for abuse prevention and reliability. Raw addresses are not stored in service logs.

## Sharing

ADU Advisor does not sell user data. Backend providers are used only to operate the app features described in this policy.

## Contact and deletion

For support or deletion requests, contact support@aduadvisor.app.
