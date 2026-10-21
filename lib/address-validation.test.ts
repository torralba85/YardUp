import { describe, expect, it } from "vitest";
import {
  ValidationAction,
  evaluateClientInputReadiness,
  evaluateGoogleAddressValidationResponse,
  evaluatePlacesAddress,
} from "./address-validation";

describe("address-validation service", () => {
  describe("evaluateClientInputReadiness", () => {
    it("identifies missing street number on a street-only query", () => {
      const readiness = evaluateClientInputReadiness("Main St, Seattle, WA");
      expect(readiness.hasStreetNumber).toBe(false);
      expect(readiness.isCompleteCandidate).toBe(false);
      expect(readiness.missingLabels).toContain("street number");
    });

    it("identifies a complete deliverable candidate when street number, street, and city/state are present", () => {
      const readiness = evaluateClientInputReadiness("1421 NE 88th St, Seattle, WA 98115");
      expect(readiness.hasStreetNumber).toBe(true);
      expect(readiness.hasStreetName).toBe(true);
      expect(readiness.hasLocalityOrState).toBe(true);
      expect(readiness.hasPostalCode).toBe(true);
      expect(readiness.isCompleteCandidate).toBe(true);
      expect(readiness.missingLabels).toEqual([]);
    });

    it("prompts for unit number when input ends with an unfinished unit designator", () => {
      const readiness = evaluateClientInputReadiness("1421 NE 88th St, Seattle, WA Apt");
      expect(readiness.needsUnitNumber).toBe(true);
      expect(readiness.isCompleteCandidate).toBe(false);
      expect(readiness.missingLabels).toContain("unit number");
    });
  });

  describe("evaluatePlacesAddress", () => {
    it("accepts a deliverable rooftop property address from Google Places API (New)", () => {
      const result = evaluatePlacesAddress({
        rawQuery: "1421 NE 88th St, Seattle, WA",
        formattedAddress: "1421 NE 88th St, Seattle, WA 98115, USA",
        placeId: "ChIJ-test-1421",
        location: { lat: 47.6924, lng: -122.3125 },
        types: ["street_address"],
        addressComponents: [
          { shortText: "1421", longText: "1421", types: ["street_number"] },
          { shortText: "NE 88th St", longText: "Northeast 88th Street", types: ["route"] },
          { shortText: "Seattle", longText: "Seattle", types: ["locality"] },
          { shortText: "WA", longText: "Washington", types: ["administrative_area_level_1"] },
          { shortText: "98115", longText: "98115", types: ["postal_code"] },
          { shortText: "US", longText: "United States", types: ["country"] },
        ],
      });

      expect(result.status).toBe("deliverable");
      expect(result.action).toBe(ValidationAction.ACCEPT);
      expect(result.deliverable).toBe(true);
      expect(result.granularity).toBe("PREMISE");
      expect(result.components.postalCode).toBe("98115");
      expect(result.message).toContain("98115");
    });

    it("rejects a street-only route prediction that lacks a street number", () => {
      const result = evaluatePlacesAddress({
        rawQuery: "NE 88th St, Seattle, WA",
        formattedAddress: "NE 88th St, Seattle, WA, USA",
        placeId: "ChIJ-route-only",
        location: { lat: 47.6924, lng: -122.3125 },
        types: ["route"],
        addressComponents: [
          { shortText: "NE 88th St", longText: "Northeast 88th Street", types: ["route"] },
          { shortText: "Seattle", longText: "Seattle", types: ["locality"] },
          { shortText: "WA", longText: "Washington", types: ["administrative_area_level_1"] },
        ],
      });

      expect(result.status).toBe("incomplete");
      expect(result.action).toBe(ValidationAction.FIX);
      expect(result.deliverable).toBe(false);
      expect(result.granularity).toBe("ROUTE");
      expect(result.missingComponents).toContain("street_number");
    });

    it("requests confirmation when the resolved house number differs from the user query", () => {
      const result = evaluatePlacesAddress({
        rawQuery: "1423 NE 88th St, Seattle, WA",
        formattedAddress: "1421 NE 88th St, Seattle, WA 98115, USA",
        types: ["street_address"],
        addressComponents: [
          { shortText: "1421", longText: "1421", types: ["street_number"] },
          { shortText: "NE 88th St", longText: "Northeast 88th Street", types: ["route"] },
          { shortText: "Seattle", longText: "Seattle", types: ["locality"] },
          { shortText: "WA", longText: "Washington", types: ["administrative_area_level_1"] },
          { shortText: "98115", longText: "98115", types: ["postal_code"] },
        ],
      });

      expect(result.status).toBe("needs_confirmation");
      expect(result.action).toBe(ValidationAction.CONFIRM);
      expect(result.deliverable).toBe(true);
    });
  });

  describe("evaluateGoogleAddressValidationResponse", () => {
    it("evaluates USPS CASS confirmed response as deliverable ACCEPT", () => {
      const result = evaluateGoogleAddressValidationResponse(
        {
          result: {
            verdict: {
              validationGranularity: "PREMISE",
              addressComplete: true,
            },
            address: {
              formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043-1351, USA",
              postalAddress: {
                regionCode: "US",
                postalCode: "94043-1351",
                administrativeArea: "CA",
                locality: "Mountain View",
                addressLines: ["1600 Amphitheatre Pkwy"],
              },
              addressComponents: [
                {
                  componentName: { text: "1600" },
                  componentType: "street_number",
                  confirmationLevel: "CONFIRMED",
                },
                {
                  componentName: { text: "Amphitheatre Pkwy" },
                  componentType: "route",
                  confirmationLevel: "CONFIRMED",
                },
              ],
            },
            geocode: {
              location: { latitude: 37.4224, longitude: -122.0842 },
              placeId: "ChIJtYuu0V25j4ARwu5e4wwRYgE",
            },
            uspsData: {
              dpvConfirmation: "Y",
            },
          },
        },
        "1600 Amphitheatre Pkwy, Mountain View, CA",
      );

      expect(result).not.toBeNull();
      expect(result?.action).toBe(ValidationAction.ACCEPT);
      expect(result?.deliverable).toBe(true);
      expect(result?.message).toContain("USPS CASS deliverable");
    });
  });
});
