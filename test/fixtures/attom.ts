/** Synthetic record using ATTOM Property API's documented field names. */
export function attomResponse() {
  return {
    status: { code: 0, msg: "SuccessWithResult", total: 1 },
    property: [{
      identifier: { attomId: 123456, apn: "test-apn" },
      address: { line1: "123 OAK ST", line2: "SEATTLE, WA 98105", locality: "SEATTLE", countrySubd: "WA", postal1: "98105", country: "US" },
      location: { latitude: "47.661", longitude: "-122.313", accuracy: "Street" },
      assessment: { owner: { name: "DO NOT RETURN OWNER" } },
    }],
  };
}
