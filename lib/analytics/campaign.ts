/**
 * Public marketing labels only. Never forward arbitrary UTM values: even a
 * syntactically valid slug can contain an address, account ID or bearer token.
 * Add new approved campaign labels here before publishing their links.
 */
const SOURCES = [
  "facebook", "instagram", "ig", "x", "youtube", "linkedin", "casita_coalition", "ucsd_chpd", "adu_california",
  "reddit", "nextdoor", "pinterest", "studio_email",
];
const MEDIUMS = ["organic_social", "social", "referral", "email", "community", "transactional"];
const CAMPAIGNS = [
  "organic_launch_202609", "brand_presence_202609",
  "address_first_20261007", "adu_intent_202610", "ca_oct26",
  "certificate_first_sale_202611", "saved_3d_link",
  "backyard_possibilities_20261005", "before_floor_plan_20261102",
  "fee_line_750_20261015", "one_backyard_20261011",
  "preapproved_next_steps_20261106", "price_it_line_by_line_20261026",
  "sd_16ft_rule_20261006", "sd_coastal_zone_20261029",
  "sd_unit_count_20261104", "social_launch_202610",
  "studio_demo_20261020", "studio_update_20261030",
  "adu_size_comparison_20261111", "adu_financing_20261111",
  "rent_resource_20261111", "permit_resource_20261111",
];
const CONTENT = ["link_in_bio", "size_demo", "financing_demo", "resource_reference"];
/**
 * Outreach links carry a per-partner source (an agent code or a builder slug).
 * GA4 gets one generic source per campaign instead, so no person or business
 * name is forwarded.
 */
const PARTNER_CAMPAIGNS = new Map([
  ["agent_pilot_202611", "agent_referral"],
  ["sd_agent_pilot_202611", "agent_referral"],
  ["sj_agent_pilot_202611", "agent_referral"],
  ["organic_sd_builder_202610", "builder_referral"],
]);

export function approvedCampaign(search: string): Record<string, string> {
  const query = new URLSearchParams(search);
  const source = query.get("utm_source") ?? "";
  const medium = query.get("utm_medium") ?? "";
  const name = query.get("utm_campaign") ?? "";
  // Reject duplicates rather than silently interpreting an ambiguous link.
  if (["utm_source", "utm_medium", "utm_campaign", "utm_content"].some((key) => query.getAll(key).length > 1)) return {};
  const partner = PARTNER_CAMPAIGNS.get(name);
  if (partner) {
    if (!source || medium !== "referral") return {};
    return { campaign_source: partner, campaign_medium: medium, campaign_name: name };
  }
  if (!SOURCES.includes(source) || !MEDIUMS.includes(medium) || !CAMPAIGNS.includes(name)) return {};
  const content = query.get("utm_content") ?? "";
  return {
    campaign_source: source,
    campaign_medium: medium,
    campaign_name: name,
    ...(CONTENT.includes(content) ? { campaign_content: content } : {}),
  };
}
