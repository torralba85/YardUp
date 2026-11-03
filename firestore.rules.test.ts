import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { CURRENT_LEGAL_CONSENT } from "./lib/legal-consent";
import { SAMPLE_LIVE_PARCEL, SAMPLE_LIVE_PARCEL_MAX } from "./test/fixtures/live-parcel";

const PROJECT_ID = "demo-lotfoundry-rules";
const OWNER_ID = "owner-1";
const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!hasFirestoreEmulator) return;
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
});

afterEach(async () => {
  await testEnv?.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function rulesEnv(): RulesTestEnvironment {
  if (!testEnv) throw new Error("Firestore rules tests require the local emulator.");
  return testEnv;
}

function ownerProfile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Alma Reyes",
    email: "alma@example.com",
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe.skipIf(!hasFirestoreEmulator)("private Studio email leads", () => {
  it("denies guest and signed-in direct reads and writes, including queued email payloads", async () => {
    await rulesEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "studioScenarioLeads", "private-lead"), { email: "owner@example.com", emailDeliveryStatus: "queued_firestore" });
    });
    for (const context of [rulesEnv().unauthenticatedContext(), rulesEnv().authenticatedContext(OWNER_ID)]) {
      const ref = doc(context.firestore(), "studioScenarioLeads", "private-lead");
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, { email: "other@example.com" }));
      await assertFails(deleteDoc(ref));
    }
  });
});

const AGENT_LISTING = "1-elm-st-san-diego";

describe.skipIf(!hasFirestoreEmulator)("agent passes", () => {
  it("denies guest and signed-in reads and writes of passes and redemption records", async () => {
    await rulesEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "agentPasses", "SMITH-ELM"), { certKey: AGENT_LISTING, status: "active", maxRedemptions: 10, redemptions: 0 });
      await setDoc(doc(context.firestore(), "agentPasses", "SMITH-ELM", "redemptions", OWNER_ID), { uid: OWNER_ID });
    });
    for (const context of [rulesEnv().unauthenticatedContext(), rulesEnv().authenticatedContext(OWNER_ID)]) {
      const pass = doc(context.firestore(), "agentPasses", "SMITH-ELM");
      const redemption = doc(context.firestore(), "agentPasses", "SMITH-ELM", "redemptions", OWNER_ID);
      await assertFails(getDoc(pass));
      await assertFails(setDoc(pass, { redemptions: 0 }));
      await assertFails(updateDoc(pass, { maxRedemptions: 1000 }));
      await assertFails(getDoc(redemption));
      await assertFails(deleteDoc(redemption));
    }
  });
});

function currentConsent(acceptedAt: unknown = serverTimestamp()) {
  return {
    termsVersion: CURRENT_LEGAL_CONSENT.termsVersion,
    privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
    adultConfirmed: true,
    acceptedAt,
  };
}

async function seedProfile(profile: Record<string, unknown>) {
  await rulesEnv().withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", OWNER_ID), profile);
  });
}

describe.skipIf(!hasFirestoreEmulator)("users/{uid} legal consent receipts", () => {
  it("allows the owner to create a current receipt using the server write time", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      setDoc(
        doc(db, "users", OWNER_ID),
        ownerProfile({ legalConsent: currentConsent() }),
      ),
    );
  });

  it("rejects a receipt written by another user", async () => {
    const db = rulesEnv().authenticatedContext("other-user").firestore();

    await assertFails(
      setDoc(
        doc(db, "users", OWNER_ID),
        ownerProfile({ legalConsent: currentConsent() }),
      ),
    );

  });

  it("rejects client-selected versions and timestamps", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const ref = doc(db, "users", OWNER_ID);

    await assertFails(
      setDoc(
        ref,
        ownerProfile({
          legalConsent: {
            ...currentConsent(Timestamp.fromDate(new Date("2026-08-01T00:00:00Z"))),
            termsVersion: "draft-version",
          },
        }),
      ),
    );

    await assertFails(
      setDoc(
        ref,
        ownerProfile({
          legalConsent: currentConsent(
            Timestamp.fromDate(new Date("2026-10-30T00:00:00Z")),
          ),
        }),
      ),
    );

    await assertFails(
      setDoc(
        ref,
        ownerProfile({
          legalConsent: {
            ...currentConsent(),
            adultConfirmed: false,
          },
        }),
      ),
    );
  });

  it("keeps legacy receipt-free profiles editable", async () => {
    await seedProfile({
      displayName: "Legacy User",
      email: "legacy@example.com",
      role: "user",
      createdAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00Z")),
      updatedAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00Z")),
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "users", OWNER_ID), {
        displayName: "Legacy User Updated",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows an older receipt to remain unchanged during profile edits", async () => {
    const acceptedAt = Timestamp.fromDate(new Date("2026-07-01T00:00:00Z"));
    await seedProfile({
      ...ownerProfile({
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      }),
      legalConsent: {
        termsVersion: "2026-07-01",
        privacyVersion: "2026-07-01",
        adultConfirmed: true,
        acceptedAt,
      },
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "users", OWNER_ID), {
        displayName: "Alma Reyes Updated",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("prevents removing or tampering with an existing receipt", async () => {
    const acceptedAt = Timestamp.fromDate(new Date("2026-10-30T00:00:00Z"));
    await seedProfile({
      ...ownerProfile({
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      }),
      legalConsent: currentConsent(acceptedAt),
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const ref = doc(db, "users", OWNER_ID);

    await assertFails(
      updateDoc(ref, {
        legalConsent: deleteField(),
        updatedAt: serverTimestamp(),
      }),
    );

    await assertFails(
      updateDoc(ref, {
        legalConsent: {
          ...currentConsent(acceptedAt),
          privacyVersion: "tampered-version",
        },
        updatedAt: serverTimestamp(),
      }),
    );

    await assertFails(
      updateDoc(ref, {
        legalConsent: currentConsent(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows upgrading from the 2026-08-26 receipt to 2026-10-30", async () => {
    const acceptedAt = Timestamp.fromDate(new Date("2026-08-26T00:00:00Z"));
    await seedProfile({
      ...ownerProfile({
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      }),
      legalConsent: {
        termsVersion: "2026-08-26",
        privacyVersion: "2026-08-26",
        adultConfirmed: true,
        acceptedAt,
      },
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "users", OWNER_ID), {
        legalConsent: currentConsent(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("accepts the previous versions on a new profile while stale pages roll over", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      setDoc(
        doc(db, "users", OWNER_ID),
        ownerProfile({
          legalConsent: {
            ...currentConsent(),
            termsVersion: "2026-08-26",
            privacyVersion: "2026-08-26",
          },
        }),
      ),
    );
  });

  it("never lets an existing receipt be rewritten to the previous versions", async () => {
    const acceptedAt = Timestamp.fromDate(new Date("2026-10-30T00:00:00Z"));
    await seedProfile({
      ...ownerProfile({
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      }),
      legalConsent: currentConsent(acceptedAt),
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertFails(
      updateDoc(doc(db, "users", OWNER_ID), {
        legalConsent: {
          ...currentConsent(),
          termsVersion: "2026-08-26",
          privacyVersion: "2026-08-26",
        },
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows an older receipt to be upgraded to the current versions", async () => {
    const acceptedAt = Timestamp.fromDate(new Date("2026-07-01T00:00:00Z"));
    await seedProfile({
      ...ownerProfile({
        createdAt: acceptedAt,
        updatedAt: acceptedAt,
      }),
      legalConsent: {
        termsVersion: "2026-07-01",
        privacyVersion: "2026-07-01",
        adultConfirmed: true,
        acceptedAt,
      },
    });
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();

    await assertSucceeds(
      updateDoc(doc(db, "users", OWNER_ID), {
        legalConsent: currentConsent(),
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe.skipIf(!hasFirestoreEmulator)("users/{userId}/savedScenarios/{scenarioId} rules", () => {
  const SCENARIO_ID = "scenario-123";

  function sampleScenario(overrides: Record<string, unknown> = {}) {
    return {
      name: "Standard Backyard Suite",
      parcelId: "oak-street",
      version: 2,
      heightConvention: "wall",
      pose: { x: 10, z: -5, rotationDeg: 90 },
      config: {
        footprint: 600,
        width: 20,
        length: 30,
        height: 12,
        roof: "shed",
        finish: "cedar",
        includeOpenings: true,
      },
      assumptions: {
        costPerSqft: {
          cedar: 340,
          lap: 315,
          stucco: 330,
          board: 355,
        },
        softCostMultiplier: 1.18,
        operatingExpenseRatio: 0.325,
        rentScenario: "conservative",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides,
    };
  }

  function sampleLiveParcel(overrides: Record<string, unknown> = {}) {
    return { ...SAMPLE_LIVE_PARCEL, ...overrides };
  }

  it("allows owner to create a scenario with scene model fields", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertSucceeds(setDoc(scenarioRef, sampleScenario()));
  });

  it("allows owner to create a scenario with extended liveParcel", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertSucceeds(
      setDoc(
        scenarioRef,
        sampleScenario({
          liveParcel: sampleLiveParcel(),
        }),
      ),
    );
  });

  it("allows the county GIS parcel source and rejects unknown sources", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const acceptedRef = doc(
      db,
      "users",
      OWNER_ID,
      "savedScenarios",
      "county-gis-source",
    );
    const rejectedRef = doc(
      db,
      "users",
      OWNER_ID,
      "savedScenarios",
      "unknown-source",
    );

    await assertSucceeds(
      setDoc(
        acceptedRef,
        sampleScenario({
          liveParcel: sampleLiveParcel({ source: "county-gis" }),
        }),
      ),
    );
    await assertFails(
      setDoc(
        rejectedRef,
        sampleScenario({
          liveParcel: sampleLiveParcel({ source: "untrusted-provider" }),
        }),
      ),
    );
  });

  it("allows owner to create a scenario with every optional field populated", async () => {
    // Guards Firestore's hard ceiling of 1000 evaluated expressions per
    // request. Every optional field that is present costs another branch, so
    // this maximal document — not the lighter SAMPLE_LIVE_PARCEL — is what says
    // whether validation still fits the budget. It did not once: adding
    // isValidMarketData pushed the extended-parcel create over the ceiling and
    // every real save would have failed with PERMISSION_DENIED.
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertSucceeds(
      setDoc(
        scenarioRef,
        sampleScenario({
          liveParcel: SAMPLE_LIVE_PARCEL_MAX,
        }),
      ),
    );
  });

  it("allows owner to read and delete their saved scenario", async () => {
    await rulesEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "users", OWNER_ID, "savedScenarios", SCENARIO_ID),
        sampleScenario({
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }),
      );
    });

    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertSucceeds(getDoc(scenarioRef));
    await assertSucceeds(deleteDoc(scenarioRef));
  });

  it("rejects create by another user or unauthenticated client", async () => {
    const unauthedDb = rulesEnv().unauthenticatedContext().firestore();
    const otherUserDb = rulesEnv().authenticatedContext("other-user").firestore();
    const scenarioRef1 = doc(unauthedDb, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);
    const scenarioRef2 = doc(otherUserDb, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertFails(setDoc(scenarioRef1, sampleScenario()));
    await assertFails(setDoc(scenarioRef2, sampleScenario()));
  });

  it("rejects create with invalid pose bounds or unknown properties", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    // Invalid rotation
    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({
          pose: { x: 0, z: 0, rotationDeg: 500 },
        }),
      ),
    );

    // Unknown property
    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({
          unknownField: "hacked",
        }),
      ),
    );
  });

  it("allows a legacy create with no version, heightConvention, or pose", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);
    const legacy = sampleScenario();
    delete (legacy as Record<string, unknown>).version;
    delete (legacy as Record<string, unknown>).heightConvention;
    delete (legacy as Record<string, unknown>).pose;

    await assertSucceeds(setDoc(scenarioRef, legacy));
  });

  it("rejects nested config, cost, and setback maps missing a required key", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    // The paired hasAll() checks were removed from isValidAduConfig,
    // isValidCostPerSqft, and isValidSetbacks to stay under Firestore's
    // 1000-expression ceiling. Required-ness now rests entirely on the
    // per-field checks: reading a key that is absent is an error, and an error
    // denies the write. These cases are what proves that, so a future edit
    // cannot quietly turn a required field optional.
    const noFootprint = sampleScenario();
    delete (noFootprint.config as Record<string, unknown>).footprint;
    await assertFails(setDoc(scenarioRef, noFootprint));

    const noFinish = sampleScenario();
    delete (noFinish.config as Record<string, unknown>).finish;
    await assertFails(setDoc(scenarioRef, noFinish));

    const noCedar = sampleScenario();
    delete (
      (noCedar.assumptions as Record<string, unknown>).costPerSqft as Record<
        string,
        unknown
      >
    ).cedar;
    await assertFails(setDoc(scenarioRef, noCedar));

    const noSideSetback = sampleScenario({
      liveParcel: sampleLiveParcel({ setbacks: { front: 20, rear: 20 } }),
    });
    await assertFails(setDoc(scenarioRef, noSideSetback));
  });

  it("rejects version 2 without the heightConvention and pose it implies", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    // migrateDesign refuses to hydrate a v2 record missing either field, so a
    // document accepted here would be written and then silently unreadable.
    const noConvention = sampleScenario();
    delete (noConvention as Record<string, unknown>).heightConvention;
    await assertFails(setDoc(scenarioRef, noConvention));

    const noPose = sampleScenario();
    delete (noPose as Record<string, unknown>).pose;
    await assertFails(setDoc(scenarioRef, noPose));
  });

  it("rejects an unrecognized scenario version", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertFails(setDoc(scenarioRef, sampleScenario({ version: 1 })));
    await assertFails(setDoc(scenarioRef, sampleScenario({ version: 3 })));
    await assertFails(
      setDoc(scenarioRef, sampleScenario({ heightConvention: "ridge" })),
    );
  });

  it("rejects liveParcel properties outside the allowlist", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({ liveParcel: sampleLiveParcel({ apn: "123-456-789" }) }),
      ),
    );
    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({
          liveParcel: sampleLiveParcel({
            boundaryGeoJson: { type: "Polygon", coordinates: [], bbox: [0, 0, 1, 1] },
          }),
        }),
      ),
    );
  });

  it("rejects malformed liveParcel state, zip, county, and marketData", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertFails(
      setDoc(scenarioRef, sampleScenario({ liveParcel: sampleLiveParcel({ state: 6 }) })),
    );
    await assertFails(
      setDoc(scenarioRef, sampleScenario({ liveParcel: sampleLiveParcel({ zip: "z".repeat(21) }) })),
    );
    // county is `string | undefined` on LiveParcelData - null is not a shape it models.
    await assertFails(
      setDoc(scenarioRef, sampleScenario({ liveParcel: sampleLiveParcel({ county: null }) })),
    );
    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({ liveParcel: sampleLiveParcel({ marketData: "not-a-map" }) }),
      ),
    );
    // An arbitrary blob is no longer accepted just because it is a map.
    await assertFails(
      setDoc(
        scenarioRef,
        sampleScenario({ liveParcel: sampleLiveParcel({ marketData: { junk: "x" } }) }),
      ),
    );
  });

  it("accepts a full San Diego county GIS parcel with lineage and a fire zone", async () => {
    // The shape /api/parcel returns for a real San Diego lot, after
    // normalizeLiveParcel and the Firestore boundary encoding: every optional
    // parcel field, market components and the full dataQuality block. The
    // budget guard above leaves dataQuality out, so this case keeps the
    // fire-zone check honest against the payload a real save sends.
    const evidence = (status: string, confidence: string) => ({
      status,
      source: { provider: "ArcGIS", dataset: "California (statewide) parcels", sourceUrl: "https://example.test/parcels" },
      retrievedAt: "2026-10-16T00:00:00.000Z",
      confidence,
      warnings: ["Setbacks are planning assumptions, not address-specific rules."],
    });
    const realistic = {
      ...SAMPLE_LIVE_PARCEL_MAX,
      address: "4321 Tecolote Rd",
      city: "San Diego, CA 92110",
      lat: 32.788,
      lng: -117.195,
      source: "county-gis",
      zip: "92110",
      county: "San Diego",
      zoning: "Unknown",
      marketData: {
        ...SAMPLE_LIVE_PARCEL_MAX.marketData,
        components: {
          rent: evidence("observed", "high"),
          constructionCost: evidence("derived", "medium"),
          operatingExpenses: evidence("defaulted", "low"),
        },
      },
      fireHazard: {
        zone: "very-high",
        responsibility: "LRA",
        source: "City of San Diego FHSZ map (2025)",
        checkedAt: "2026-10-16T00:00:00.000Z",
      },
      dataQuality: {
        version: 1,
        fields: Object.fromEntries(
          ["address", "lotArea", "lotDimensions", "existingHouseSqft", "maxLotCoveragePercent", "setbacks", "zoning", "boundaryGeoJson"]
            .map((field) => [field, evidence("observed", "high")]),
        ),
        providerAttempts: [
          { provider: "ArcGIS", dataset: "California (statewide) parcels", sourceUrl: "https://example.test/parcels", outcome: "matched" },
        ],
        warnings: ["Zoning, setbacks, and maximum lot coverage are unverified; confirm local planning rules."],
      },
    };
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertSucceeds(setDoc(scenarioRef, sampleScenario({ liveParcel: realistic })));
  });

  it("rejects a malformed fire zone", async () => {
    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);
    const valid = SAMPLE_LIVE_PARCEL_MAX.fireHazard;

    for (const fireHazard of [
      "very-high",
      { ...valid, zone: "extreme" },
      { ...valid, source: 7 },
      { ...valid, source: "s".repeat(201) },
      { zone: "high", source: "x" },
      { ...valid, polygonId: 12 },
    ]) {
      await assertFails(
        setDoc(scenarioRef, sampleScenario({ liveParcel: sampleLiveParcel({ fireHazard }) })),
      );
    }
    await assertSucceeds(
      setDoc(scenarioRef, sampleScenario({ liveParcel: sampleLiveParcel({ fireHazard: valid }) })),
    );
  });

  it("rejects update on existing scenarios", async () => {
    await rulesEnv().withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "users", OWNER_ID, "savedScenarios", SCENARIO_ID),
        sampleScenario({
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }),
      );
    });

    const db = rulesEnv().authenticatedContext(OWNER_ID).firestore();
    const scenarioRef = doc(db, "users", OWNER_ID, "savedScenarios", SCENARIO_ID);

    await assertFails(
      updateDoc(scenarioRef, {
        name: "Updated Name",
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

