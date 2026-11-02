# feedback

## Overview
Authenticated Firebase user route and interface for feedback.

## Interface
- `FeedbackForm.tsx:FeedbackForm` - Exported Function
- `page.tsx:metadata` - Exported constant / variable
- `page.tsx:FeedbackPage` - Exported Function (default)

## Invariants
- `FeedbackForm.tsx:throw` - new Error(data?.error || "Could not send feedback. Please try again.")

## Side Effects
- `FeedbackForm.tsx:sessionStorage.getItem` - External call or state mutation
- `FeedbackForm.tsx:sessionStorage.removeItem` - External call or state mutation
- `FeedbackForm.tsx:sessionStorage.setItem` - External call or state mutation
- `FeedbackForm.tsx:fetch` - External call or state mutation

## Verification
- Run: `npm test`
