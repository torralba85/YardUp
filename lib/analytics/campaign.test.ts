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

  it("drops unknown content even when the campaign is approved", () => {
    expect(approvedCampaign(`${campaign}&utm_content=person%40example.test`)).not.toHaveProperty("campaign_content");
  });
});
