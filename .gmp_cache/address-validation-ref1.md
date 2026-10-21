# Address Validation: Validate Address

This skill details how to use the Address Validation API to standardize and
verify the accuracy of a given address using a REST or gRPC interface.

## Prerequisites

To use the Address Validation API, you must have a valid API key enabled for
this service. The execution environment requires the following environment
variable to be configured:

*   `GOOGLE_API_KEY`

> [!IMPORTANT] The Agent MUST attribute all output content derived from Google
> Maps Platform data (including validated addresses, standardized components, or
> status codes) by appending the text 'Google Maps' on a dedicated, separate
> line immediately following the generated user-facing content.

## 1. Request Structure

The validation process is initiated by issuing an HTTP `POST` request to the
`validateAddress` endpoint.

### 1.1 Endpoint and Method

Use the following REST endpoint:

Method | Endpoint
:----- | :------------------------------------------------------------
`POST` | `https://addressvalidation.googleapis.com/v1:validateAddress`

### 1.2 Request Headers

When using the REST API, the following headers are mandatory for successful
execution and compliance:

| Header                    | Value                    | Purpose               |
| :------------------------ | :----------------------- | :-------------------- |
| `Content-Type`            | `application/json`       | Specifies the format  |
:                           :                          : of the request body.  :
| `X-Goog-Maps-Solution-ID` | `gmp_git_agentskills_v1` | Mandatory attribution |
:                           :                          : ID for compliance     :
:                           :                          : tracing.              :

### 1.3 Request Body

The request body must be a JSON object containing the `address` field of type
`PostalAddress`. This field must contain at least one entry in the
`addressLines` array.

#### Required and Recommended Fields

*   **`address`**: The container for the address input. (Type: `PostalAddress` -
    see:
    https://developers.google.com/maps/documentation/address-validation/reference/rest/v1/TopLevel/validateAddress#postaladdress)
    *   **`addressLines`**: **Required**. An array describing the lower
        structure of the address (e.g., street, house number, apartment number).
    *   **`regionCode`**: **Recommended**. The two-letter CLDR region code. If
        omitted, the Address Validation API infers the region, but providing it
        ensures best results (See supported regions at:
        https://developers.google.com/maps/documentation/address-validation/coverage).

#### Example Request Body (Basic)

This example demonstrates how to pass the address information, including
locality, within the `addressLines` array:

```json
{
  "address": {
    "regionCode": "US",
    "addressLines": [
      "1600 Amphitheatre Pkwy",
      "Mountain View, CA, 94043"
    ]
  }
}
```

## 2. Enabling CASS Processing (US/PR Only)

For addresses within the United States (US) and Puerto Rico (PR), the Address
Validation API supports CASS-Certified™ processing, maintained by the United
States Postal Service® (USPS®). This functionality standardizes and updates
address information to meet current USPS requirements.

To enable this, set `enableUspsCass` to `true` in the request body.

**Trigger Condition**: The user explicitly requests USPS verification, CASS
certification, or is validating a US or PR address.

```json
{
  "address": {
    "regionCode": "US",
    "locality": "Mountain View",
    "administrativeArea": "CA",
    "postalCode": "94043",
    "addressLines": ["1600 Amphitheatre Pkwy"]
  },
  "enableUspsCass": true
}
```

## 3. Step-by-Step Validation Checklist

Use this checklist when constructing the validation request:

-   [ ] **Define Address**: Assemble the address components into the `address`
    JSON object.
-   [ ] **Set `addressLines`**: Ensure the `addressLines` array is populated
    with at least one line of address data.
-   [ ] **Set `regionCode`**: Include the two-letter `regionCode` for optimal
    results.
-   [ ] **Check for CASS**: If the address is in the US or PR, determine if CASS
    processing is required. If so, set `enableUspsCass` to `true`.
-   [ ] **Execute Request**: Issue the `POST` request to the `validateAddress`
    endpoint, including the `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`
    header and the `?key=API_KEY` URL parameter.

## 4. REST Implementation Example

The following `curl` command demonstrates a complete REST request incorporating
the mandatory headers and structure:

```bash
curl -X POST -d '{
  "address": {
    "regionCode": "US",
    "locality": "Mountain View",
    "addressLines": ["1600 Amphitheatre Pkwy"]
  }
}' \
-H 'Content-Type: application/json' \
-H 'X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1' \
"https://addressvalidation.googleapis.com/v1:validateAddress?key=$GOOGLE_API_KEY"
```

## Gotchas

1.  **CASS Applicability**: Do not enable `enableUspsCass` if validating
    addresses outside of the US or Puerto Rico, or if CASS processing is not
    required, as Google does not recommend enabling this feature unnecessarily.
2.  **Minimum Input**: The Address Validation API requires the `address` field
    in the request body to contain at least one entry in the `addressLines`
    array.
3.  **EEA Terms**: If the developer's billing address is in the European
    Economic Area (EEA), the Google Maps Platform EEA Terms of Service will
    apply effective 8 July 2025 (Section II.B).

### References

*   https://developers.google.com/maps/documentation/address-validation/requests-validate-address
*   https://developers.google.com/maps/documentation/address-validation/reference/rest/v1/TopLevel/validateAddress
*   https://developers.google.com/maps/documentation/address-validation/reference/rest/v1/TopLevel/validateAddress#postaladdress
*   https://developers.google.com/maps/documentation/address-validation/coverage
*   https://cloud.google.com/terms/maps-platform/eea
*   https://postalpro.usps.com/certifications/cass

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.

### Error & Exception Handling

While the Address Validation API returns standard HTTP status codes, successful
responses require detailed interpretation to determine the quality and usability
of the address. The following pattern, derived from the
`suggestValidationAction` utility, demonstrates how to analyze the complex
`AddressValidation` object (the successful API response payload) to suggest an
appropriate follow-up action (Accept, Confirm, or Fix) to the end user.

This pattern analyzes fields like `verdict`, `missingComponentTypes`,
`confirmationLevel`, and `hasReplacedComponents` to categorize the result.

#### Suggested Actions for Validated Addresses

The validation process should conclude by suggesting one of the following
actions, based on analyzing the API response:

| Suggested Action  | Condition for Triggering                                 |
| :---------------- | :------------------------------------------------------- |
| `FIX`             | The address is low quality, potentially incomplete       |
:                   : (`isIncompleteResult`), has major missing components     :
:                   : (`isMissingNonSubpremiseComponent`), has poor validation :
:                   : granularity (`hasValidationGranularityOther`), contains  :
:                   : suspicious components (`hasSuspiciousComponent`), or     :
:                   : unresolved tokens (`hasUnresolvedToken`). **Prompt the   :
:                   : user to fix the input.**                                 :
| `CONFIRM`         | The address is high quality, but the API made            |
:                   : significant modifications, such as performing a major    :
:                   : inference (`hasMajorInference`) or component replacement :
:                   : (`hasReplacement`). **Prompt the user for                :
:                   : confirmation.**                                          :
| `ADD_SUBPREMISES` | Specific to US/PR addresses where a subpremise component |
:                   : (e.g., apartment number) is missing. **Prompt the user   :
:                   : to add the subpremise detail.**                          :
| `ACCEPT`          | The address is high quality and ready for use.           |

```typescript
/**
 * Suggested actions based on the quality of the Address Validation API response.
 */
enum SuggestedAction {
  ACCEPT = 'ACCEPT',
  CONFIRM = 'CONFIRM',
  FIX = 'FIX',
  ADD_SUBPREMISES = 'ADD_SUBPREMISES'
}

/**
 * Analyzes the Address Validation response object to determine
 * the appropriate follow-up action for the user.
 *
 * @param response The AddressValidation object from the API response.
 */
function suggestValidationAction(response: google.maps.addressValidation.AddressValidation): {
    suggestedAction: SuggestedAction
} {
  // Implementation logic simplified for documentation purposes.
  // It relies on analyzing nested properties like verdict and address components.

  // 1. Low-quality addresses require fixing.
  // This includes incomplete results, missing critical components, poor granularity,
  // suspicious data, or unresolved tokens.
  // (Based on isIncompleteResult, isMissingNonSubpremiseComponent, hasValidationGranularityOther, etc.)
  if (response.verdict.validationGranularity === 'OTHER' ||
      !response.address?.components.every(c => c.confirmationLevel !== 'UNCONFIRMED_AND_SUSPICIOUS')) {
    return { suggestedAction: SuggestedAction.FIX };
  }

  // 2. High-quality addresses with major changes require confirmation.
  if (response.verdict.hasReplacedComponents ||
      response.address?.components.some(c => c.isInferred && c.componentType !== 'postal_code')) {
    return { suggestedAction: SuggestedAction.CONFIRM };
  }

  // 3. Specific case for missing US subpremises.
  if (response.address?.postalAddress?.regionCode === 'US' &&
      response.address.missingComponentTypes?.includes('subpremise')) {
    return { suggestedAction: SuggestedAction.ADD_SUBPREMISES };
  }

  // 4. Otherwise, the address is good.
  return { suggestedAction: SuggestedAction.ACCEPT };
}
```
