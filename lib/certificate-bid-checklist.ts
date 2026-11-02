/**
 * Scope Checklist (builder RFQ sheet) recorded in the paid Certificate of
 * Feasibility: the scope items California ADU quotes most often leave out, so
 * a homeowner can ask three builders to price the same job without subjective
 * price verdicts.
 *
 * @module certificate-bid-checklist
 */

/** One line of the RFQ sheet. */
export interface BidScopeItem {
  id: string;
  /** What the line covers. */
  title: string;
  /** What to ask each builder, naming the usual exclusion. */
  ask: string;
}

/** Alias for {@link BidScopeItem} using the neutral Scope Checklist naming. */
export type ScopeChecklistItem = BidScopeItem;

/** Comparison columns on the printed sheet. */
export const BID_LEVELING_BUILDERS = ["Builder A", "Builder B", "Builder C"] as const;

/** Lines shown before purchase; the rest stay locked. */
export const BID_CHECKLIST_PREVIEW_COUNT = 2;

/** The 12 scope items, in the order a project spends money on them. */
export const BID_LEVELING_CHECKLIST: readonly BidScopeItem[] = [
  {
    id: "design",
    title: "Architectural plans, structural engineering & energy code calcs (Title 24 in CA)",
    ask: "Is design in the price, or quoted separately by an architect or engineer?",
  },
  {
    id: "permits",
    title: "City plan check & permit fees",
    ask: "Are plan check, permit and impact fees included or billed to you at cost? Is there an expediting fee?",
  },
  {
    id: "wet-utilities",
    title: "Wet utility trenching: sewer & water tie-in",
    ask: "How many feet of trench are included, and what is the price per foot past 50 ft?",
  },
  {
    id: "electrical",
    title: "Electrical panel upgrade & trenching",
    ask: "Is a 200A+ service or subpanel included, with the trench to the backyard home?",
  },
  {
    id: "site-work",
    title: "Site grading, demolition & soil haul-away",
    ask: "Are grading, demolition, tree removal and hauling away soil included?",
  },
  {
    id: "foundation",
    title: "Foundation type: standard slab vs. raised or hillside footings",
    ask: "Which foundation is priced, and is a soils report included if the city asks for one?",
  },
  {
    id: "solar",
    title: "Rooftop solar PV (Title 24 in CA)",
    ask: "Is the solar system a new detached unit needs included, or a documented exception?",
  },
  {
    id: "sprinklers",
    title: "Fire sprinklers",
    ask: "Included if the main house needs them or fire access calls for them?",
  },
  {
    id: "fire-rated-edges",
    title: "Hardscape & fire-rated walls and eaves near property lines",
    ask: "Are walks, patios, and fire-rated walls or eaves within 5 ft of a property line included?",
  },
  {
    id: "mechanical",
    title: "HVAC mini-split & heat-pump water heater",
    ask: "Are heating, cooling and water heating equipment in the price, and do they meet the energy code?",
  },
  {
    id: "finishes",
    title: "Interior finish allowances",
    ask: "What allowance is set for cabinets, counters, flooring and appliances, and what happens past it?",
  },
  {
    id: "closeout",
    title: "Final inspection, certificate of occupancy & address assignment",
    ask: "Who schedules final inspection and handles the certificate of occupancy and new address?",
  },
];

/** Neutral alias for {@link BID_LEVELING_CHECKLIST}. */
export const SCOPE_CHECKLIST: readonly ScopeChecklistItem[] = BID_LEVELING_CHECKLIST;
