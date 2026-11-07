/** Official listings reviewed 2026-11-03 to 2026-11-06. See docs/preapproved-plans.md for evidence and maintenance. */
import type { PreapprovedPlan, PreapprovedProgram } from "./preapproved-plans";

export const preapprovedPrograms: readonly PreapprovedProgram[] = [
  {
    "id": "ca-san-diego",
    "city": "San Diego",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "catalogUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "The City accepts the County of San Diego standard plans, plus Chula Vista's and Encinitas's preapproved plans, with a 30-day review. Plans must meet the currently adopted codes and the San Diego Municipal Code; ask the plan's provider about licensing."
  },
  {
    "id": "ca-chula-vista",
    "city": "Chula Vista",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.chulavistaca.gov/departments/development-services/permit-information/city-permits/accessory-dwelling-units",
    "catalogUrl": "https://www.chulavistaca.gov/departments/development-services/permit-information/city-permits/accessory-dwelling-units",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "The City's standard ADU plans, from 498 to 1,199 sq ft, are reviewed in 14 business days instead of 21, with about $1,000 less in plan review fees. Using one requires a contract with its designer. Individual plans are not listed here yet; use the City's page."
  },
  {
    "id": "ca-oceanside",
    "city": "Oceanside",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.ci.oceanside.ca.us/gov/dev/planning",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "ca-escondido",
    "city": "Escondido",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.escondido.gov/DocumentCenter/View/544/City-ADU-Handout-PDF",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "ca-carlsbad",
    "city": "Carlsbad",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "catalogUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "Four permit-ready single-story detached plans: studio 400, one-bedroom 680, two-bedroom 800 and three-bedroom 999 sq ft, each in three architectural styles that share one footprint. All four are listed below; the City's page has the full sets and submittal forms."
  },
  {
    "id": "ca-imperial-beach",
    "city": "Imperial Beach",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://imperialbeachca.gov/268/Accessory-Dwelling-Units",
    "catalogUrl": "https://imperialbeachca.gov/268/Accessory-Dwelling-Units",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "The City publishes one pre-approved detached ADU plan set. Check the FEMA flood map first: the plans cannot be used in a Special Flood Hazard Area."
  },
  {
    "id": "ca-la-mesa",
    "city": "La Mesa",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "catalogUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "The City publishes previews of five pre-approved plans. Email Planning@cityoflamesa.gov for the official construction set of the one you choose."
  },
  {
    "id": "ca-san-marcos",
    "city": "San Marcos",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.sanmarcosca.gov/Business-Services/Building-Division/Permit-Ready-ADUs",
    "catalogUrl": "https://www.sanmarcosca.gov/Business-Services/Building-Division/Permit-Ready-ADUs",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "The City offers pre-approved one-story detached plans and decides within 30 days of a complete application. No alterations are allowed. Individual plans are not listed here yet; use the City's catalog."
  },
  {
    "id": "ca-san-diego-county",
    "city": "Unincorporated San Diego County",
    "state": "CA",
    "authority": "county",
    "status": "verified",
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "catalogUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "Official program listing checked. Confirm current-code acceptance, lot-specific requirements and permission to use the documents before applying."
  },
  {
    "id": "ca-santa-clara-county",
    "city": "Unincorporated Santa Clara County",
    "state": "CA",
    "authority": "county",
    "status": "verified",
    "sourceUrl": "https://plandev.santaclaracounty.gov/services/development-services/building/pre-approved-adu-program",
    "catalogUrl": "https://plandev.santaclaracounty.gov/services/development-services/building/pre-approved-adu-program",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "The County's own 800 and 1,200 sq ft plans are free to residents of unincorporated areas. Unmodified plans are charged the minimum two hours of plan review. Expedited permitting isn't available in the Wildland Urban Interface or in special flood hazard or geologic hazard zones. The County also lists builders and designers with pre-approved plans; use its page."
  },
  {
    "id": "ca-los-angeles-county",
    "city": "Unincorporated Los Angeles County",
    "state": "CA",
    "authority": "county",
    "status": "verified",
    "sourceUrl": "https://pw.lacounty.gov/building-and-safety/adu/pre-approved",
    "catalogUrl": "https://pw.lacounty.gov/building-and-safety/adu/pre-approved",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "The County's own Standard Plans A, B and C are free to use. They must be built as designed, though they can be turned to face any direction or mirrored. Each needs a site-specific plot plan approved by Regional Planning and site-specific Title 24 energy calculations. Design firms' plans in the County's catalog are bought from their owners and are not listed here."
  },
  {
    "id": "ca-pasadena",
    "city": "Pasadena",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.cityofpasadena.net/planning/planning-division/community-planning/accessory-dwelling-units/adu-standard-plans-program/",
    "catalogUrl": "https://www.cityofpasadena.net/planning/planning-division/community-planning/accessory-dwelling-units/adu-standard-plans-program/",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "The City's own Prototype A studio is free and, updated to the 2025 building code, can be used on most single-family lots citywide. The City's other standard plans are now limited to lots red-tagged in the Eaton Fire and are not listed here. No modifications are allowed, and a Hold Harmless Agreement is required."
  },
  {
    "id": "ca-los-altos",
    "city": "Los Altos",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.losaltosca.gov/211/Accessory-Dwelling-Units-ADUs",
    "catalogUrl": "https://www.losaltosca.gov/211/Accessory-Dwelling-Units-ADUs",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "The City's own Permit-Ready plans are free, each in a Mediterranean, Traditional or Contemporary style. Their architectural drawings are online; the full sets, with structural, mechanical, electrical and plumbing sheets, can be viewed at City Hall. Some options can be chosen, but the plans can't be modified. Privately designed plans the City also pre-approves are bought from their designers and are not listed here."
  },
  {
    "id": "ca-sacramento",
    "city": "Sacramento",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://adu.cityofsacramento.org/Shelf-ready-plans",
    "catalogUrl": "https://adu.cityofsacramento.org/Shelf-ready-plans",
    "verifiedAt": "2026-11-06",
    "reviewedAt": "2026-11-06",
    "notes": "Shelf Ready plans are published to the 2022 Residential Building Code. Confirm current-code acceptance before applying."
  },
  {
    "id": "ca-san-jose",
    "city": "San José",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/preapproved-adus",
    "catalogUrl": "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/preapproved-adus",
    "verifiedAt": "2026-11-03",
    "reviewedAt": "2026-11-03",
    "notes": "Vendors offer City-reviewed plans for detached ADUs from 476 to 991 sq ft. On a qualifying lot outside geohazard, flood and wildland-urban interface zones, the permit can be issued the same day as the plan review meeting. Individual plans are not listed here yet; use the City's page."
  },
  {
    "id": "ca-encinitas",
    "city": "Encinitas",
    "state": "CA",
    "authority": "city",
    "status": "verified",
    "sourceUrl": "https://www.encinitasca.gov/government/departments/development-services/policy-planning-housing/policy-planning/accessory-dwelling-units",
    "catalogUrl": "https://www.encinitasca.gov/government/departments/development-services/policy-planning-housing/policy-planning/accessory-dwelling-units",
    "verifiedAt": "2026-11-05",
    "reviewedAt": "2026-11-05",
    "notes": "Permit-Ready ADU (PRADU) plans from two architects, studio to three bedrooms, kept current with the building code, with customizable exterior materials and openings. The City of San Diego accepts them too. Individual plans are not listed here yet; use the City's page."
  },
  {
    "id": "ca-el-cajon",
    "city": "El Cajon",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.elcajon.gov/your-government/departments/community-development",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "ca-vista",
    "city": "Vista",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.cityofvista.com/",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "wa-seattle",
    "city": "Seattle",
    "state": "WA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.seattle.gov/sdci/permits/common-projects/accessory-dwelling-units",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "or-portland",
    "city": "Portland",
    "state": "OR",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.portland.gov/",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "tx-austin",
    "city": "Austin",
    "state": "TX",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.austintexas.gov/development-services/additional-dwelling-units",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "ca-los-angeles",
    "city": "Los Angeles",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://dbs.lacity.gov/",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "ca-oakland",
    "city": "Oakland",
    "state": "CA",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.oaklandca.gov/",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  },
  {
    "id": "co-denver",
    "city": "Denver",
    "state": "CO",
    "authority": "city",
    "status": "needs-verification",
    "sourceUrl": "https://www.denvergov.org/",
    "reviewedAt": "2026-11-06",
    "notes": "Individual plans and current program availability need verification. Check with the permitting authority; an empty catalog does not mean no program exists."
  }
];

export const preapprovedPlans: readonly PreapprovedPlan[] = [
  {
    "id": "sacramento-studio-367",
    "jurisdictionId": "ca-sacramento",
    "name": "Shelf Ready Studio",
    "provider": "City of Sacramento",
    "sqft": 367,
    "bedrooms": 0,
    "sourceUrl": "https://adu.cityofsacramento.org/Shelf-ready-plans",
    "documentUrl": "https://adu.cityofsacramento.org/content/dam/cityofsacramento/adu/plan/ADU_STUDIO.pdf",
    "footprint": {
      "width": 20,
      "length": 20,
      "shape": "rectangle",
      "sheet": "Shelf Ready studio plan set, sheet A2.1 (20x20; recessed porch under the roof)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "All-electric; published to the 2022 Residential Building Code. No modifications; mirroring allowed. Add a lot-specific site plan and confirm current-code acceptance.",
    "feeNote": "City publishes these plan sets as free. Permit, construction and lot-specific preparation costs remain.",
    "status": "active"
  },
  {
    "id": "sacramento-one-bedroom-559",
    "jurisdictionId": "ca-sacramento",
    "name": "Shelf Ready One-bedroom",
    "provider": "City of Sacramento",
    "sqft": 559,
    "bedrooms": 1,
    "sourceUrl": "https://adu.cityofsacramento.org/Shelf-ready-plans",
    "documentUrl": "https://adu.cityofsacramento.org/content/dam/cityofsacramento/adu/plan/ADU_1_BEDROOM.pdf",
    "footprint": {
      "width": 20,
      "length": 30,
      "shape": "rectangle",
      "sheet": "Shelf Ready one-bedroom plan set, sheet A2.1 (20x30; recessed porch under the roof)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "All-electric; published to the 2022 Residential Building Code. No modifications; mirroring allowed. Add a lot-specific site plan and confirm current-code acceptance.",
    "feeNote": "City publishes these plan sets as free. Permit, construction and lot-specific preparation costs remain.",
    "status": "active"
  },
  {
    "id": "sacramento-two-bedroom-747",
    "jurisdictionId": "ca-sacramento",
    "name": "Shelf Ready Two-bedroom",
    "provider": "City of Sacramento",
    "sqft": 747,
    "bedrooms": 2,
    "sourceUrl": "https://adu.cityofsacramento.org/Shelf-ready-plans",
    "documentUrl": "https://adu.cityofsacramento.org/content/dam/cityofsacramento/adu/plan/ADU_2_BEDROOM.pdf",
    "footprint": {
      "width": 20,
      "length": 40,
      "shape": "rectangle",
      "sheet": "Shelf Ready two-bedroom plan set, sheet A2.1 (20x40; recessed porch under the roof)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "All-electric; published to the 2022 Residential Building Code. No modifications; mirroring allowed. Add a lot-specific site plan and confirm current-code acceptance.",
    "feeNote": "City publishes these plan sets as free. Permit, construction and lot-specific preparation costs remain.",
    "status": "active"
  },
  {
    "id": "la-mesa-plan-a",
    "jurisdictionId": "ca-la-mesa",
    "name": "La Mesa Plan A",
    "provider": "City of La Mesa",
    "sqft": 224,
    "bedrooms": 0,
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "documentUrl": "https://www.cityoflamesa.gov/DocumentCenter/View/24808/PLAN-A---224-SQFT---STUDIO-ADU",
    "documentLabel": "Plan preview",
    "footprint": {
      "width": 14,
      "length": 16,
      "shape": "rectangle",
      "sheet": "La Mesa Plan A preview, floor plan page 7"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Email Planning@cityoflamesa.gov for the official construction set. Add a lot-specific site plan, Title 24 energy calculations and supplemental documents; a soils report is required over 500 sq ft.",
    "status": "active"
  },
  {
    "id": "la-mesa-plan-b",
    "jurisdictionId": "ca-la-mesa",
    "name": "La Mesa Plan B",
    "provider": "City of La Mesa",
    "sqft": 400,
    "bedrooms": 1,
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "documentUrl": "https://www.cityoflamesa.gov/DocumentCenter/View/24937/PLAN-B---400-SQFT---ONE-BEDROOM-ADU",
    "documentLabel": "Plan preview",
    "footprint": {
      "width": 16,
      "length": 25,
      "shape": "rectangle",
      "sheet": "La Mesa Plan B preview, floor plan page 7"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Email Planning@cityoflamesa.gov for the official construction set. Add a lot-specific site plan, Title 24 energy calculations and supplemental documents; a soils report is required over 500 sq ft.",
    "status": "active"
  },
  {
    "id": "la-mesa-plan-c",
    "jurisdictionId": "ca-la-mesa",
    "name": "La Mesa Plan C",
    "provider": "City of La Mesa",
    "sqft": 499,
    "bedrooms": 1,
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "documentUrl": "https://www.cityoflamesa.gov/DocumentCenter/View/25024/PLAN-C---499-SQFT---ONE-BEDROOM-ADU",
    "documentLabel": "Plan preview",
    "footprint": {
      "width": 14,
      "length": 35.67,
      "shape": "rectangle",
      "sheet": "La Mesa Plan C preview, floor plan page 7"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Email Planning@cityoflamesa.gov for the official construction set. Add a lot-specific site plan, Title 24 energy calculations and supplemental documents; a soils report is required over 500 sq ft.",
    "status": "active"
  },
  {
    "id": "la-mesa-plan-d",
    "jurisdictionId": "ca-la-mesa",
    "name": "La Mesa Plan D",
    "provider": "City of La Mesa",
    "sqft": 990,
    "bedrooms": 2,
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "documentUrl": "https://www.cityoflamesa.gov/DocumentCenter/View/24945/PLAN-D---990-SQFT---TWO-BEDROOM-ADU",
    "documentLabel": "Plan preview",
    "footprint": {
      "width": 30,
      "length": 33,
      "shape": "rectangle",
      "sheet": "La Mesa Plan D preview, floor plan page 7"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Email Planning@cityoflamesa.gov for the official construction set. Add a lot-specific site plan, Title 24 energy calculations and supplemental documents; a soils report is required over 500 sq ft.",
    "status": "active"
  },
  {
    "id": "la-mesa-plan-e",
    "jurisdictionId": "ca-la-mesa",
    "name": "La Mesa Plan E",
    "provider": "City of La Mesa",
    "sqft": 1199,
    "bedrooms": 3,
    "sourceUrl": "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    "documentUrl": "https://www.cityoflamesa.gov/DocumentCenter/View/24809/PLAN-E---1199-SQFT---THREE-BEDROOM-ADU",
    "documentLabel": "Plan preview",
    "footprint": {
      "width": 28,
      "length": 48.75,
      "shape": "irregular",
      "sheet": "La Mesa Plan E preview, sheet a1.0 (stepped; optional trellis excluded)"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Email Planning@cityoflamesa.gov for the official construction set. Add a lot-specific site plan, Title 24 energy calculations and supplemental documents; a soils report is required over 500 sq ft.",
    "status": "active"
  },
  {
    "id": "imperial-beach-600",
    "jurisdictionId": "ca-imperial-beach",
    "name": "Imperial Beach Pre-Approved ADU",
    "provider": "City of Imperial Beach",
    "sqft": 600,
    "bedrooms": 1,
    "sourceUrl": "https://imperialbeachca.gov/268/Accessory-Dwelling-Units",
    "documentUrl": "https://imperialbeachca.gov/DocumentCenter/View/346/Pre-Approved-ADU-Plans-600-SF-PDF",
    "footprint": {
      "width": 21,
      "length": 28.58,
      "shape": "rectangle",
      "sheet": "Imperial Beach pre-approved plan set, floor plan page 2"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Detached unit. Not for lots in a FEMA Special Flood Hazard Area. Drawn to the 2019 California codes, so ask the Building Division what the current code cycle changes; add site-specific information.",
    "status": "active"
  },
  {
    "id": "carlsbad-studio-400",
    "jurisdictionId": "ca-carlsbad",
    "name": "Carlsbad Permit-Ready Studio",
    "provider": "City of Carlsbad",
    "sqft": 400,
    "bedrooms": 0,
    "sourceUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "documentUrl": "https://www.carlsbadca.gov/home/showpublisheddocument/28336",
    "footprint": {
      "width": 16.67,
      "length": 23.67,
      "shape": "rectangle",
      "sheet": "Carlsbad permit-ready studio set, sheet A1.1 (all three styles share the footprint; porches excluded)"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Single-story detached unit in one of three architectural styles. Submit it with the City's B-75 checklist, hold-harmless agreement, B-1 application and a site plan; lots in the Coastal Zone also need a minor coastal development permit.",
    "status": "active"
  },
  {
    "id": "carlsbad-one-bedroom-680",
    "jurisdictionId": "ca-carlsbad",
    "name": "Carlsbad Permit-Ready One-bedroom",
    "provider": "City of Carlsbad",
    "sqft": 680,
    "bedrooms": 1,
    "sourceUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "documentUrl": "https://www.carlsbadca.gov/home/showpublisheddocument/28330",
    "footprint": {
      "width": 16.83,
      "length": 39.83,
      "shape": "rectangle",
      "sheet": "Carlsbad permit-ready one-bedroom set, sheet A1.1 (all three styles share the footprint; porches excluded)"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Single-story detached unit in one of three architectural styles. Submit it with the City's B-75 checklist, hold-harmless agreement, B-1 application and a site plan; lots in the Coastal Zone also need a minor coastal development permit.",
    "status": "active"
  },
  {
    "id": "carlsbad-two-bedroom-800",
    "jurisdictionId": "ca-carlsbad",
    "name": "Carlsbad Permit-Ready Two-bedroom",
    "provider": "City of Carlsbad",
    "sqft": 800,
    "bedrooms": 2,
    "sourceUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "documentUrl": "https://www.carlsbadca.gov/home/showpublisheddocument/28332",
    "footprint": {
      "width": 18,
      "length": 43.83,
      "shape": "rectangle",
      "sheet": "Carlsbad permit-ready two-bedroom set, sheet A1.1 (all three styles share the footprint; porches excluded)"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Single-story detached unit in one of three architectural styles. Submit it with the City's B-75 checklist, hold-harmless agreement, B-1 application and a site plan; lots in the Coastal Zone also need a minor coastal development permit.",
    "status": "active"
  },
  {
    "id": "carlsbad-three-bedroom-999",
    "jurisdictionId": "ca-carlsbad",
    "name": "Carlsbad Permit-Ready Three-bedroom",
    "provider": "City of Carlsbad",
    "sqft": 999,
    "bedrooms": 3,
    "sourceUrl": "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    "documentUrl": "https://www.carlsbadca.gov/home/showpublisheddocument/28334",
    "footprint": {
      "width": 29.58,
      "length": 47.67,
      "shape": "irregular",
      "sheet": "Carlsbad permit-ready three-bedroom set, sheet A1.1 (all three styles share the footprint; porches excluded)"
    },
    "verifiedAt": "2026-11-05",
    "restrictions": "Single-story detached unit in one of three architectural styles. Submit it with the City's B-75 checklist, hold-harmless agreement, B-1 application and a site plan; lots in the Coastal Zone also need a minor coastal development permit.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-a",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan A",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 3,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds670_24x36.pdf",
    "footprint": {
      "width": 30,
      "length": 40,
      "shape": "rectangle",
      "sheet": "County pds670 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-b",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan B",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 2,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds673_24x36.pdf",
    "footprint": {
      "width": 32,
      "length": 54,
      "shape": "irregular",
      "sheet": "County pds673 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-c",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan C",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 2,
    "bathrooms": 2,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds675_24x36.pdf",
    "footprint": {
      "width": 34.25,
      "length": 35,
      "shape": "rectangle",
      "sheet": "County pds675 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-d",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan D",
    "provider": "County of San Diego",
    "sqft": 1000,
    "bedrooms": 1,
    "bathrooms": 1.5,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds674_24x36.pdf",
    "footprint": {
      "width": 31.5,
      "length": 31.75,
      "shape": "rectangle",
      "sheet": "County pds674 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-e",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan E",
    "provider": "County of San Diego",
    "sqft": 800,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds672_24x36.pdf",
    "footprint": {
      "width": 25,
      "length": 42.17,
      "shape": "irregular",
      "sheet": "County pds672 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "san-diego-county-plan-f",
    "jurisdictionId": "ca-san-diego-county",
    "name": "County Standard Plan F",
    "provider": "County of San Diego",
    "sqft": 600,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds671_24x36.pdf",
    "footprint": {
      "width": 21,
      "length": 28.58,
      "shape": "rectangle",
      "sheet": "County pds671 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. County program applies to unincorporated areas; approval elsewhere requires that authority’s acceptance.",
    "status": "active"
  },
  {
    "id": "santa-clara-county-two-bedroom-800",
    "jurisdictionId": "ca-santa-clara-county",
    "name": "County Pre-Approved Two-bedroom",
    "provider": "County of Santa Clara",
    "sqft": 800,
    "bedrooms": 2,
    "bathrooms": 1,
    "sourceUrl": "https://plandev.santaclaracounty.gov/services/development-services/building/pre-approved-adu-program",
    "documentUrl": "https://stgenpln.blob.core.windows.net/document/SCC_Preapproved_ADU_Plans_800SF.pdf",
    "footprint": {
      "width": 25,
      "length": 32,
      "shape": "rectangle",
      "sheet": "SCC Standard ADU 800 SF set, sheet A.2 (04/14/2026; both styles share it; optional expanded porch excluded)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit in a Standard (Traditional) or Contemporary style, drawn to the 2025 California codes, for unincorporated lots only. Add a project-specific site plan, Title 24 energy forms and a stamped roof truss design. Changes beyond the plan's options need a licensed professional's stamp and lose the expedited review.",
    "feeNote": "The County publishes these plans free, with CAD files. Unmodified plans pay its minimum plan review fee; permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "santa-clara-county-three-bedroom-1200",
    "jurisdictionId": "ca-santa-clara-county",
    "name": "County Pre-Approved Three-bedroom",
    "provider": "County of Santa Clara",
    "sqft": 1200,
    "bedrooms": 3,
    "bathrooms": 2,
    "sourceUrl": "https://plandev.santaclaracounty.gov/services/development-services/building/pre-approved-adu-program",
    "documentUrl": "https://stgenpln.blob.core.windows.net/document/SCC_Preapproved_ADU_Plans_1200SF.pdf",
    "footprint": {
      "width": 29.94,
      "length": 39.94,
      "shape": "rectangle",
      "sheet": "SCC Standard ADU 1200 SF set, sheet A.2 (04/14/2026; both styles share it; optional expanded porch excluded)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit in a Standard (Traditional) or Contemporary style, drawn to the 2025 California codes, for unincorporated lots only. Add a project-specific site plan, Title 24 energy forms and a stamped roof truss design. Changes beyond the plan's options need a licensed professional's stamp and lose the expedited review.",
    "feeNote": "The County publishes these plans free, with CAD files. Unmodified plans pay its minimum plan review fee; permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-angeles-county-plan-a",
    "jurisdictionId": "ca-los-angeles-county",
    "name": "County Standard ADU Plan A",
    "provider": "County of Los Angeles",
    "sqft": 1200,
    "bedrooms": 3,
    "bathrooms": 1,
    "sourceUrl": "https://pw.lacounty.gov/building-and-safety/adu/pre-approved",
    "documentUrl": "https://pw.lacounty.gov/building-and-safety/docs/ADU_A_1200.pdf",
    "footprint": {
      "width": 30,
      "length": 40,
      "shape": "rectangle",
      "sheet": "2026 Los Angeles County Standard Plan A (No. 27001), sheet A1"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit drawn to the 2025 California codes, for unincorporated areas. Build it as designed; turning or mirroring it is allowed. Add a Regional Planning-approved site-specific plot plan, site-specific Title 24 calculations and the agency approvals on the County's referral sheet.",
    "feeNote": "The County owns these plans and lets homeowners use them free. Plan check, permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-angeles-county-plan-b",
    "jurisdictionId": "ca-los-angeles-county",
    "name": "County Standard ADU Plan B",
    "provider": "County of Los Angeles",
    "sqft": 1200,
    "bedrooms": 2,
    "bathrooms": 1,
    "sourceUrl": "https://pw.lacounty.gov/building-and-safety/adu/pre-approved",
    "documentUrl": "https://pw.lacounty.gov/building-and-safety/docs/ADU_B_1200.pdf",
    "footprint": {
      "width": 32,
      "length": 54,
      "shape": "irregular",
      "sheet": "2026 Los Angeles County Standard Plan B (No. 27002), sheet A1 (L; 33′×16′ notch)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit drawn to the 2025 California codes, for unincorporated areas. Build it as designed; turning or mirroring it is allowed. Add a Regional Planning-approved site-specific plot plan, site-specific Title 24 calculations and the agency approvals on the County's referral sheet.",
    "feeNote": "The County owns these plans and lets homeowners use them free. Plan check, permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-angeles-county-plan-c",
    "jurisdictionId": "ca-los-angeles-county",
    "name": "County Standard ADU Plan C",
    "provider": "County of Los Angeles",
    "sqft": 800,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://pw.lacounty.gov/building-and-safety/adu/pre-approved",
    "documentUrl": "https://pw.lacounty.gov/building-and-safety/docs/ADU_C_800.pdf",
    "footprint": {
      "width": 25,
      "length": 42.17,
      "shape": "irregular",
      "sheet": "2026 Los Angeles County Standard Plan C (No. 27003), sheet A1 (L; 24′-2″×10′-6″ notch)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit drawn to the 2025 California codes, for unincorporated areas. Build it as designed; turning or mirroring it is allowed. Add a Regional Planning-approved site-specific plot plan, site-specific Title 24 calculations and the agency approvals on the County's referral sheet.",
    "feeNote": "The County owns these plans and lets homeowners use them free. Plan check, permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "pasadena-prototype-a-374",
    "jurisdictionId": "ca-pasadena",
    "name": "Pasadena Prototype A Studio",
    "provider": "City of Pasadena",
    "sqft": 374,
    "bedrooms": 0,
    "bathrooms": 1,
    "sourceUrl": "https://www.cityofpasadena.net/planning/planning-division/community-planning/accessory-dwelling-units/adu-standard-plans-program/",
    "documentUrl": "https://www.cityofpasadena.net/planning/wp-content/uploads/sites/30/Prototype-A-Updated.pdf",
    "footprint": {
      "width": 17,
      "length": 22,
      "shape": "rectangle",
      "sheet": "Pasadena Prototype A (updated to the 2025 CBC), sheet A-2.0 (02-03-2026; 65 sq ft covered porch excluded)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached studio drawn to the 2025 California codes. No modifications, however minor; a licensed professional can change it, but it then loses pre-review. The lot must be zoned residential and not on a slope, hillside or expansive soil. Keep 4 ft side and rear setbacks, and walls with openings 5 ft from side and rear lines. Sign the City's Hold Harmless Agreement and add a site plan.",
    "feeNote": "The City offers this plan free. Permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-altos-studio-one-bedroom-525",
    "jurisdictionId": "ca-los-altos",
    "name": "Los Altos Studio or One-bedroom",
    "provider": "City of Los Altos",
    "sqft": 525,
    "bathrooms": 1,
    "sourceUrl": "https://www.losaltosca.gov/211/Accessory-Dwelling-Units-ADUs",
    "documentUrl": "https://www.losaltosca.gov/DocumentCenter/View/255",
    "documentLabel": "Architectural drawings (Style A)",
    "footprint": {
      "width": 15,
      "length": 35,
      "shape": "rectangle",
      "sheet": "Los Altos Permit-Ready Studio/1 Bedroom, Style A sheet A10 (1/9/2025): ±15′×35′ to the outside face of the walls, 14′-8″×34′-8″ to face of stud; the three styles share its framing"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit with an optional wall that closes off the sleeping area. Its title sheet cites the 2025 California codes. Choose from the plan's options, but don't modify it; the full set is viewed at City Hall, and submittals follow the City Permit-Ready ADU Submittal Requirements.",
    "feeNote": "The City offers these plans free. Permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-altos-one-bedroom-854",
    "jurisdictionId": "ca-los-altos",
    "name": "Los Altos One-bedroom",
    "provider": "City of Los Altos",
    "sqft": 854,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://www.losaltosca.gov/211/Accessory-Dwelling-Units-ADUs",
    "documentUrl": "https://www.losaltosca.gov/DocumentCenter/View/264",
    "documentLabel": "Architectural drawings (Style A)",
    "footprint": {
      "width": 22.08,
      "length": 40.25,
      "shape": "irregular",
      "sheet": "Los Altos Permit-Ready 1 Bedroom, Style A sheet A10 (1/9/2025): outer ±22′-1″×40′-3″ to the outside face of the walls; the 11′-9″ bedroom wing steps back 3′; the three styles share its framing"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit. Its title sheet cites the 2025 California codes. Choose from the plan's options, but don't modify it; the full set is viewed at City Hall, and submittals follow the City Permit-Ready ADU Submittal Requirements.",
    "feeNote": "The City offers these plans free. Permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "los-altos-two-bedroom-1190",
    "jurisdictionId": "ca-los-altos",
    "name": "Los Altos Two-bedroom",
    "provider": "City of Los Altos",
    "sqft": 1190,
    "bedrooms": 2,
    "bathrooms": 2,
    "sourceUrl": "https://www.losaltosca.gov/211/Accessory-Dwelling-Units-ADUs",
    "documentUrl": "https://www.losaltosca.gov/DocumentCenter/View/273",
    "documentLabel": "Architectural drawings (Style A)",
    "footprint": {
      "width": 36.75,
      "length": 42,
      "shape": "irregular",
      "sheet": "Los Altos Permit-Ready 2 Bedroom, Style A sheet A10 (1/9/2025): L, outer ±36′-9″×42′ to the outside face of the walls with a ±25′×14′-1″ notch; the three styles share its framing"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Detached one-story unit. Its title sheet cites the 2025 California codes. Choose from the plan's options, but don't modify it; the full set is viewed at City Hall, and submittals follow the City Permit-Ready ADU Submittal Requirements.",
    "feeNote": "The City offers these plans free. Permit, construction and site work costs remain.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-a",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan A",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 3,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds670_24x36.pdf",
    "footprint": {
      "width": 30,
      "length": 40,
      "shape": "rectangle",
      "sheet": "County pds670 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-b",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan B",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 2,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds673_24x36.pdf",
    "footprint": {
      "width": 32,
      "length": 54,
      "shape": "irregular",
      "sheet": "County pds673 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-c",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan C",
    "provider": "County of San Diego",
    "sqft": 1200,
    "bedrooms": 2,
    "bathrooms": 2,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds675_24x36.pdf",
    "footprint": {
      "width": 34.25,
      "length": 35,
      "shape": "rectangle",
      "sheet": "County pds675 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-d",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan D",
    "provider": "County of San Diego",
    "sqft": 1000,
    "bedrooms": 1,
    "bathrooms": 1.5,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds674_24x36.pdf",
    "footprint": {
      "width": 31.5,
      "length": 31.75,
      "shape": "rectangle",
      "sheet": "County pds674 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-e",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan E",
    "provider": "County of San Diego",
    "sqft": 800,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds672_24x36.pdf",
    "footprint": {
      "width": 25,
      "length": 42.17,
      "shape": "irregular",
      "sheet": "County pds672 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  },
  {
    "id": "san-diego-city-plan-f",
    "jurisdictionId": "ca-san-diego",
    "name": "County Standard Plan F",
    "provider": "County of San Diego",
    "sqft": 600,
    "bedrooms": 1,
    "bathrooms": 1,
    "sourceUrl": "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    "documentUrl": "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/pds671_24x36.pdf",
    "footprint": {
      "width": 21,
      "length": 28.58,
      "shape": "rectangle",
      "sheet": "County pds671 floor plan, sheet A1 (rev. 01/01/2026)"
    },
    "verifiedAt": "2026-11-06",
    "restrictions": "Plans are approximately 85% complete. Complete project-specific information and required checklist; confirm current adopted codes and licensing. The City of San Diego expressly lists these County plans as accepted.",
    "status": "active"
  }
];
