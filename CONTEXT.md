# YardUp

YardUp (LotFoundry) helps homeowners assess modeled ADU feasibility for a Lot. Homeowners explore studies in the Studio and buy per-property Certificates; Builders buy homeowner Leads.

## Language

### Land & data

**Lot**:
The physical piece of land — its dimensions and existing house.
_Avoid_: parcel, property, site

**Parcel**:
A description of a Lot used in a feasibility study, including its identity, dimensions, existing building information, and regulatory limits. Its values may be observed, derived, assumed, or unavailable.
_Avoid_: lot, site

**Live Parcel**:
A Parcel obtained through a lookup for a real Address, including a Fallback Parcel when property data is unavailable. Live describes the lookup, not verification of its dimensions or regulatory limits.
_Avoid_: real parcel

**Live Parcel Acquisition**:
Resolution of an accepted Address or location into a Live Parcel, preserving the entered Address and the evidence supporting the returned Parcel.

**Studio Parcel Handoff**:
The one-time transfer of a pending Address or a resolved Parcel into Studio. A resolved selection carries its Parcel across navigation so opening it does not spend another lookup.

**Preset**:
A built-in curated Parcel used for demos and as an estimation base.
_Avoid_: demo parcel, demo preset

**Estimated Parcel**:
A preliminary Parcel for a Guest's geocoded Address, with dimensions and regulatory assumptions borrowed from a Preset. A located Address does not establish the Lot's geometry or existing building footprint.

**Fallback Parcel**:
A Live Parcel whose lot dimensions and regulatory assumptions are borrowed from a Preset because the lookup did not obtain property-specific parcel data. It remains an estimate despite being returned for a real Address.
_Avoid_: verified parcel

**Parcel Evidence**:
The source, dates, observation status, confidence, and caveats supporting each value in a Parcel. A Parcel can combine measurements and assumptions from different sources, and evidence for an Address does not establish evidence for boundaries, buildings, or regulatory limits.
_Avoid_: verified parcel (for evidence about only some values)

**Address**:
The street address identifying the Lot under study. A typed or geocoded Address identifies the intended location without establishing its parcel boundaries or permitting authority.
_Avoid_: property

### Studio & engine

**Design**:
The proposed ADU's dimensions, appearance, and Pose, separate from the Parcel and Financial Assumptions used to assess it.
_Avoid_: scenario

**Pose**:
The proposed ADU's position and orientation relative to the modeled Lot.
_Avoid_: design (for position and orientation alone)

**ADU Footprint**:
The ground-level wall outline and area of the proposed ADU as represented in the Studio, excluding roof overhangs. Its area can differ from a Pre-approved Plan's Published Floor Area.
_Avoid_: floor area, roof outline

**Wall Height**:
The proposed ADU's modeled height to the top of its walls, before roof rise is added.
_Avoid_: total height, height (without specifying wall or total)

**Total Height**:
The proposed ADU's modeled height to its highest roof point, including roof rise.
_Avoid_: wall height, height (without specifying wall or total)

**Scenario**:
A feasibility study of one Parcel with a Design and Financial Assumptions. It may also include a selected Plan Reference, Project Brief, or Style-Matched Concept.
_Avoid_: design

**Saved Scenario**:
A retained snapshot of a Scenario's inputs: its Parcel basis, Design, Financial Assumptions, and any saved plan or generated material. Results are recalculated on reopening, while any Saved Brief remains a historical narrative.
_Avoid_: design, certificate

**Scenario Restoration**:
Reopening a Saved Scenario with its own Parcel basis, Design, Financial Assumptions, and optional saved material. Material absent from that saved study is not inherited from another Scenario.

**Financial Assumptions**:
The construction-cost, soft-cost, operating-expense, and rent expectations used to estimate a Scenario's economics.
_Avoid_: design, financial results

**Feasibility**:
The assessment of a proposed ADU's modeled placement, coverage capacity, and economics using a Parcel, Design, and Financial Assumptions. Its conclusions are limited by the available Parcel Evidence.
_Avoid_: verdict

**Feasibility Result**:
The calculated findings for a Scenario: modeled coverage, placement findings, cost range, income, and payback estimates.

**Zoning**:
The Studio's limited assessment of modeled lot coverage and ADU capacity, including applicable capacity protections. It is not a comprehensive determination of compliance with local Regulations.
_Avoid_: regulations, zoning approval

**Regulations**:
Curated ADU permit guidance per jurisdiction.
_Avoid_: zoning

**Placement Validation**:
The geometric assessment of the proposed ADU at its current Pose against the Buildable Envelope and modeled existing house, including clearance and separation-review findings. A fitting alternative Pose does not make the current Pose fit.
_Avoid_: compliance check

**Buildable Envelope**:
The area of the modeled Lot remaining inside the setbacks applied to the proposed ADU. Existing buildings and other site constraints can further limit placement within it.
_Avoid_: approved building area

**Scene Placement**:
The proposed ADU's placement on the modeled Lot, together with its geometric fit and the limits of the supporting Parcel Evidence. A modeled fit is not site-specific permit approval.
_Avoid_: site fit, setback collision

**Snap to Fit**:
The Studio action that seeks a fitting Pose for the current Design within the modeled setbacks and house clearances. Finding no candidate does not establish that the Lot cannot accommodate an ADU.
_Avoid_: automatic approval

**Verdict**:
The interpreted headline — Likely Feasible, Needs Review, or Unlikely — with readiness and constraints.
_Avoid_: result, score

### Official plans & concepts

**Pre-approved Plan**:
An ADU plan listed through a permitting authority's pre-approved plan program, subject to that program's conditions. Its pre-approval does not establish approval for the Lot under study.
_Avoid_: approved Scenario, permit

**Published Floor Area**:
The floor area stated in a Pre-approved Plan's official listing. It can differ from both the Plan Outline's enclosed area and the ADU Footprint used for a study.
_Avoid_: footprint (for a listed floor-area figure)

**Plan Outline**:
The outside-wall bounds recorded from a Pre-approved Plan's drawing. For an irregular plan, these describe its outer rectangle rather than its exact wall outline.
_Avoid_: floor area, exact irregular footprint

**Usable Rectangle**:
A rectangular stand-in for an irregular Pre-approved Plan, retaining its overall depth and approximating its Published Floor Area. It differs from the full Plan Outline, so its modeled fit alone does not establish that the full plan fits.
_Avoid_: exact plan footprint

**Plan Reference**:
The selected Pre-approved Plan and its permitting authority associated with a Scenario. The reference remains distinct from the Design, which may be resized or otherwise differ from the plan.
_Avoid_: approved Design

**Style-Matched Concept**:
An ADU visual concept generated to reflect a home's architectural style. It is distinct from a Pre-approved Plan and may be retained with a Saved Scenario.
_Avoid_: pre-approved plan, permit drawing

### Documents & purchase

**Project Brief**:
The AI-generated narrative for a Lot — parcel interpretation, ADU concept, and permit timeline — viewable after purchase.
_Avoid_: AI brief

**Saved Brief**:
A Project Brief retained in a Saved Scenario as a historical narrative, reusable only while that study's Feasibility inputs remain unchanged.

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
