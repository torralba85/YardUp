# YardUp

YardUp (LotFoundry) tells a homeowner whether an ADU fits their lot and sells the proof. Homeowners explore feasibility in the 3D studio and buy per-property certificates; builders buy homeowner leads.

## Language

### Land & data

**Lot**:
The physical piece of land — its dimensions and existing house.
_Avoid_: parcel, property, site

**Parcel**:
A data record describing a Lot: identity, dimensions, and regulatory limits.
_Avoid_: lot, site

**Live Parcel**:
A Parcel resolved at runtime for a real address, from whichever provider answered.
_Avoid_: real parcel

**Live Parcel Acquisition**:
An accepted Address or coordinate lookup that resolves a Live Parcel while preserving the entered Address and provider evidence.

**Preset**:
A built-in curated Parcel used for demos and as an estimation base.
_Avoid_: demo parcel, demo preset

**Estimated Parcel**:
A guest's Parcel — Preset dimensions re-addressed to a geocoded location, upgraded to a Live Parcel after sign-up.

**Address**:
The identifying string for a Lot — typed, geocoded, and the stable identity of parcels and certificates.
_Avoid_: property

### Studio & engine

**Design**:
An ADU configuration plus its placement pose, independent of any parcel.
_Avoid_: scenario

**Scenario**:
A saved Design for one address, with financial assumptions, viewable later.
_Avoid_: design

**Scenario Restoration**:
Reopening a Scenario as its saved study, including only its own saved Project Brief and matched concept.

**Feasibility**:
The engine calculation turning parcel, design, and assumptions into coverage compliance and economics.
_Avoid_: verdict

**Feasibility Result**:
The engine's output: coverage, cost range, income, and payback.

**Zoning**:
The computed coverage compliance of a design on a parcel.
_Avoid_: regulations

**Regulations**:
Curated ADU permit guidance per jurisdiction.
_Avoid_: zoning

**Placement Validation**:
The pure-geometry check that an ADU at its actual pose fits the buildable envelope, clears the house, and meets separation review.
_Avoid_: compliance check

**Scene Placement**:
The studio service on placement validation: default-pose search and placement queries for the 3D view.
_Avoid_: site fit

**Verdict**:
The interpreted headline — Likely Feasible, Needs Review, or Unlikely — with readiness and constraints.
_Avoid_: result, score

### Documents & purchase

**Project Brief**:
The AI-generated narrative for a Lot — parcel interpretation, ADU concept, and permit timeline — viewable after purchase.
_Avoid_: AI brief

**Saved Brief**:
A Project Brief recorded in a Scenario, reused as a historical snapshot until its Feasibility inputs change.

**Report**:
A rendered document combining parcel, design, result, and brief.
_Avoid_: certificate

**Certificate**:
A purchased, serial-numbered Report for one Lot — bought once per property, with permanent access.
_Avoid_: report

**Checkout**:
The payment flow that starts a purchase: Stripe on the website, Google Play billing on mobile.
_Avoid_: paywall, purchase

**Certificate Recovery**:
Verifying a Homeowner's Grant after Checkout or when reopening a Certificate, including restoring its Parcel; a return link alone does not prove a Purchase.

**Purchase**:
A completed payment for a certificate or lead unlock.
_Avoid_: checkout

**Grant**:
The durable access record written upon purchase, carrying the parcel snapshot; never expires.
_Avoid_: entitlement

**Unlock**:
The user-visible effect of access — a purchased certificate or lead becoming viewable.
_Avoid_: purchase

**Lead Credit**:
Prepaid balance spent on lead unlocks, bought in packs.
_Avoid_: token

### People

**Guest**:
A visitor who has never signed in; gets one real-address lookup.
_Avoid_: anonymous visitor

**Homeowner**:
The account type for property owners: explores lots, saves scenarios, and buys certificates.
_Avoid_: member, user

**Builder**:
The account type for home-building pros: buys leads to access homeowner contact information. Purchases only on the website.

**Lead**:
A homeowner's contact information offered to builders; unlocking reveals it.
