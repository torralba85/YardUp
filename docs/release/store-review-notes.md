# Store Review Notes

ADU Advisor is an offline-first ADU feasibility planning app. The app can be reviewed without creating a traditional account. Firebase anonymous authentication is used only to protect cloud-backed quote request writes.

Backend services are live during review:

- Firebase Functions region: us-central1
- Regulation guide: source-cited seeded guide
- Design concept: deterministic fallback if OpenAI is unavailable
- Property history: fallback verification records until a municipal provider is connected
- Quote request: authenticated Firebase anonymous write

Reviewers should verify:

1. Start a property study from Home.
2. Open Studio and move or rotate the ADU footprint.
3. Generate a concept.
4. Save an estimate.
5. Request a quote from Build.

Important limitation: the current release is a planning aid and does not claim official permit approval, official assessor records, or contractor availability guarantees.
