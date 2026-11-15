import { describe, expect, it } from "vitest";
import { approvedCampaign } from "./campaign";

const campaign = "utm_source=facebook&utm_medium=organic_social&utm_campaign=adu_size_comparison_20261111";

describe("approved campaign labels", () => {
  it("maps public labels without forwarding property or click identifiers", () => {
    expect(approvedCampaign(`${campaign}&utm_content=size_demo&q=123+Main+St&certKey=bearer&gclid=secret`)).toEqual({
      campaign_source: "facebook", campaign_medium: "organic_social",
      campaign_name: "adu_size_comparison_20261111", campaign_content: "size_demo",
    });
  });

  it.each([
    "utm_source=123-main-st&utm_medium=organic_social&utm_campaign=adu_size_comparison_20261111",
    "utm_source=facebook&utm_medium=private_email&utm_campaign=adu_size_comparison_20261111",
    "utm_source=facebook&utm_medium=organic_social&utm_campaign=account_123456",
    "utm_source=facebook&utm_medium=organic_social",
    `${campaign}&utm_source=x`,
    `${campaign}&utm_content=size_demo&utm_content=private`,
  ])("drops unknown, incomplete or ambiguous attribution: %s", (query) => {
    expect(approvedCampaign(query)).toEqual({});
  });

  it.each([
    ["utm_source=x&utm_medium=organic_social&utm_campaign=address_first_20261007", "x", "organic_social"],
    ["utm_source=reddit&utm_medium=community&utm_campaign=adu_intent_202610", "reddit", "community"],
    ["utm_source=studio_email&utm_medium=transactional&utm_campaign=saved_3d_link", "studio_email", "transactional"],
  ])("maps published links that predate the allowlist: %s", (query, source, medium) => {
    expect(approvedCampaign(query)).toMatchObject({ campaign_source: source, campaign_medium: medium });
  });

  it.each([
    ["utm_source=agent_smith-elm&utm_medium=referral&utm_campaign=sd_agent_pilot_202611", "agent_referral"],
    ["utm_source=some_builder&utm_medium=referral&utm_campaign=organic_sd_builder_202610", "builder_referral"],
  ])("replaces a per-partner source with a generic label: %s", (query, source) => {
    const labels = approvedCampaign(`${query}&utm_content=smith&pass=SMITH-ELM`);
    expect(labels).toEqual({
      campaign_source: source, campaign_medium: "referral",
      campaign_name: new URLSearchParams(query).get("utm_campaign"),
    });
    expect(JSON.stringify(labels)).not.toMatch(/smith|some_builder/i);
  });

  it.each([
    "utm_medium=referral&utm_campaign=sd_agent_pilot_202611",
    "utm_source=agent_smith-elm&utm_medium=email&utm_campaign=sd_agent_pilot_202611",
  ])("drops incomplete partner attribution: %s", (query) => {
    expect(approvedCampaign(query)).toEqual({});
  });

  it("drops unknown content even when the campaign is approved", () => {
    expect(approvedCampaign(`${campaign}&utm_content=person%40example.test`)).not.toHaveProperty("campaign_content");
  });
});
