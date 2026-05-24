# Guided ADU Stepper Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the ADU Advisor user journey into an intuitive, easily-navigated, and visually stunning step-by-step wizard.

**Architecture:** Create a new stack route `app/wizard` outside the standard `(tabs)` router to hide bottom navigation. Extend the active project domain model to save model, placement, and style details, and persist them via SQLite JSON serialization.

**Tech Stack:** React Native, Expo Router v54, TypeScript, Zustand, expo-sqlite, Vitest.

---

### Task 1: Extend Domain Types

**Files:**
- Modify: `src/domain/types.ts:80-97`

- [ ] **Step 1: Add new wizard fields to the Project interface**
  Modify [src/domain/types.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/domain/types.ts) to declare `selectedModelId`, `selectedStyleId`, and `placement` properties.

```typescript
export interface Project {
  id: string;
  name: string;
  address: string;
  jurisdiction: JurisdictionId;
  lotSqFt: number;
  primaryHomeSqFt: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  lastEstimate?: EstimateResult;
  lastEstimateInput?: EstimateInput;
  sitePhotoUri?: string;
  
  // Wizard state:
  selectedModelId?: string;
  selectedStyleId?: DesignStyleId;
  placement?: DesignPlacement;
}
```

- [ ] **Step 2: Run typecheck to verify interface compatibility**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/domain/types.ts
  git commit -m "feat: add wizard state fields to Project interface"
  ```

---

### Task 2: Implement Zustand Store Actions

**Files:**
- Modify: `src/state/appStore.ts:40-70`, `src/state/appStore.ts:280-310`
- Create: `src/state/appStore.test.ts`
- Test: `src/state/appStore.test.ts`

- [ ] **Step 1: Write failing unit test for app store wizard actions**
  Create [src/state/appStore.test.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/state/appStore.test.ts):

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore wizard actions", () => {
  it("saves selected model and placement coordinates", async () => {
    const store = useAppStore.getState();
    const projectId = store.activeProjectId;
    const modelId = "studio-adu";
    const placement = { xPercent: 45, yPercent: 55, rotation: 45 };

    await store.saveWizardModelAndPlacement(projectId, modelId, placement);

    const updated = useAppStore.getState().projects.find((p) => p.id === projectId);
    expect(updated?.selectedModelId).toBe(modelId);
    expect(updated?.placement).toEqual(placement);
  });

  it("saves selected architectural style ID", async () => {
    const store = useAppStore.getState();
    const projectId = store.activeProjectId;
    const styleId = "warm_modern";

    await store.saveWizardStyle(projectId, styleId);

    const updated = useAppStore.getState().projects.find((p) => p.id === projectId);
    expect(updated?.selectedStyleId).toBe(styleId);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/state/appStore.test.ts`
  Expected: FAIL with compilation errors (actions not defined on store interface)

- [ ] **Step 3: Modify appState interface in appStore**
  Update the `AppState` interface in [src/state/appStore.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/state/appStore.ts):

```typescript
interface AppState {
  // ... existing fields ...
  saveWizardModelAndPlacement: (
    projectId: string,
    modelId: string,
    placement: DesignPlacement,
  ) => Promise<void>;
  saveWizardStyle: (projectId: string, styleId: DesignStyleId) => Promise<void>;
}
```

- [ ] **Step 4: Implement actions in appStore creator**
  Add the action bodies inside `useAppStore` in [src/state/appStore.ts](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/state/appStore.ts):

```typescript
  saveWizardModelAndPlacement: async (projectId, modelId, placement) => {
    const updatedProject = get().projects.find((project) => project.id === projectId);
    if (!updatedProject) return;

    const project: Project = {
      ...updatedProject,
      selectedModelId: modelId,
      placement,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projects: state.projects.map((item) => (item.id === projectId ? project : item)),
    }));

    await persist(() => upsertProject(project));
  },

  saveWizardStyle: async (projectId, styleId) => {
    const updatedProject = get().projects.find((project) => project.id === projectId);
    if (!updatedProject) return;

    const project: Project = {
      ...updatedProject,
      selectedStyleId: styleId,
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projects: state.projects.map((item) => (item.id === projectId ? project : item)),
    }));

    await persist(() => upsertProject(project));
  },
```

- [ ] **Step 5: Run unit tests to verify they pass**
  Run: `npx vitest run src/state/appStore.test.ts`
  Expected: PASS

- [ ] **Step 6: Commit**
  Run:
  ```bash
  git add src/state/appStore.ts src/state/appStore.test.ts
  git commit -m "feat: implement wizard store actions and tests"
  ```

---

### Task 3: Create WizardHeader and Layout Wrapper

**Files:**
- Create: `src/components/WizardHeader.tsx`
- Create: `app/wizard/_layout.tsx`

- [ ] **Step 1: Implement WizardHeader component**
  Create [src/components/WizardHeader.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/src/components/WizardHeader.tsx):

```typescript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme";

interface WizardHeaderProps {
  currentStep: number;
}

const steps = [
  { label: "Lot" },
  { label: "Fit" },
  { label: "Style" },
  { label: "ROI" },
  { label: "Build" },
];

export default function WizardHeader({ currentStep }: WizardHeaderProps) {
  const router = useRouter();

  const handleExit = () => {
    Alert.alert(
      "Exit Wizard",
      "Are you sure you want to exit? Your progress is saved locally.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => router.replace("/(tabs)"),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.meta}>ADU STEP {currentStep} OF 5</Text>
          <Text style={styles.title}>{steps[currentStep - 1]?.label} Feasibility</Text>
        </View>
        <TouchableOpacity onPress={handleExit} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.stepperContainer}>
        <View style={styles.track} />
        <View style={[styles.progressTrack, { width: `${((currentStep - 1) / 4) * 100}%` }]} />
        
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <View key={step.label} style={styles.stepUnit}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.completedCircle,
                  isActive && styles.activeCircle,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      isActive && styles.activeCircleText,
                    ]}
                  >
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isActive || isCompleted) && styles.activeStepLabel,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  meta: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 22,
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    paddingHorizontal: spacing.xs,
  },
  track: {
    position: "absolute",
    top: 10,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  progressTrack: {
    position: "absolute",
    top: 10,
    left: spacing.md,
    height: 2,
    backgroundColor: colors.accent,
    zIndex: 2,
  },
  stepUnit: {
    alignItems: "center",
    zIndex: 3,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  completedCircle: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activeCircle: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  circleText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  activeCircleText: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 9,
    marginTop: 4,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeStepLabel: {
    color: colors.accent,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Implement wizard root stack layout**
  Create [app/wizard/_layout.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/_layout.tsx):

```typescript
import React from "react";
import { Stack } from "expo-router";

export default function WizardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
```

- [ ] **Step 3: Run typecheck to verify compiler status**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/components/WizardHeader.tsx app/wizard/_layout.tsx
  git commit -m "feat: create WizardHeader component and router layout"
  ```

---

### Task 4: Implement Step 1: Address & Lot Facts Screen

**Files:**
- Create: `app/wizard/step-1.tsx`

- [ ] **Step 1: Write step-1 screen code**
  Create [app/wizard/step-1.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/step-1.tsx) leveraging the current lot facts presentation components:

```typescript
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useActiveProject, useActiveParcelSummary, useActiveGuide } from "../../src/state/appStore";
import WizardHeader from "../../src/components/WizardHeader";
import { colors, typography, spacing, shadows } from "../../src/theme";

export default function Step1Screen() {
  const router = useRouter();
  const project = useActiveProject();
  const parcel = useActiveParcelSummary();
  const guide = useActiveGuide();

  if (!project) return null;

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={1} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.subhead}>Verify Lot Feasibility</Text>
          <Text style={styles.body}>Review zoning guidelines, boundary lines, and setbacks retrieved for this parcel.</Text>
        </View>

        <!-- Address Card -->
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SITE ADDRESS</Text>
          <Text style={styles.cardTitle}>{project.address}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{project.jurisdiction.toUpperCase()}</Text>
          </View>
        </View>

        <!-- Zoning & Dimensions -->
        {parcel && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PARCEL INFORMATION</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.metricName}>Zoning Code</Text>
                <Text style={styles.metricVal}>{parcel.zoning}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.metricName}>Lot Area</Text>
                <Text style={styles.metricVal}>{parcel.lotSqFt.toLocaleString()} sqft</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.metricName}>Minimum Setbacks</Text>
            <View style={styles.row}>
              <Text style={styles.bodySmall}>Front: {parcel.setbacks.front}</Text>
              <Text style={styles.bodySmall}>Side: {parcel.setbacks.side}</Text>
              <Text style={styles.bodySmall}>Rear: {parcel.setbacks.rear}</Text>
            </View>
          </View>
        )}

        <!-- Guide Summary -->
        {guide && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>REGULATORY OVERVIEW</Text>
            <Text style={styles.bodySmall}>{guide.summary}</Text>
            <View style={styles.divider} />
            <Text style={styles.cardSubTitle}>Key Constraints</Text>
            {guide.blockers.map((blocker, i) => (
              <Text key={i} style={styles.bullet}>• {blocker}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      <!-- Bottom Navigation Control -->
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => router.push("/wizard/step-2")}
        >
          <Text style={styles.nextText}>Select Model & Fit →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.md,
  },
  subhead: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bodySmall: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  cardLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  cardSubTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 6,
    marginTop: 6,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  col: {
    flex: 1,
  },
  metricName: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  bullet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Run typecheck to verify**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/wizard/step-1.tsx
  git commit -m "feat: implement step-1 lot facts screen"
  ```

---

### Task 5: Implement Step 2: Model & Backyard Fit Screen

**Files:**
- Create: `app/wizard/step-2.tsx`

- [ ] **Step 1: Write step-2 screen code**
  Create [app/wizard/step-2.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/step-2.tsx) containing the model selector and canvas editor:

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { aduModels } from "../../src/data/aduModels";
import WizardHeader from "../../src/components/WizardHeader";
import { colors, typography, spacing, shadows } from "../../src/theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const canvasWidth = width - 40;
const canvasHeight = 180;

export default function Step2Screen() {
  const router = useRouter();
  const project = useActiveProject();
  const { saveWizardModelAndPlacement } = useAppStore();

  const [selectedModelId, setSelectedModelId] = useState(aduModels[0].id);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (project?.selectedModelId) {
      setSelectedModelId(project.selectedModelId);
    }
    if (project?.placement) {
      setPosX(project.placement.xPercent);
      setPosY(project.placement.yPercent);
      setRot(project.placement.rotation);
    }
  }, [project]);

  const activeModel = aduModels.find((m) => m.id === selectedModelId) || aduModels[0];

  const handleNext = async () => {
    if (project) {
      await saveWizardModelAndPlacement(project.id, selectedModelId, {
        xPercent: posX,
        yPercent: posY,
        rotation: rot,
      });
    }
    router.push("/wizard/step-3");
  };

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={2} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subhead}>Position Your ADU</Text>
        <Text style={styles.body}>Select a footprint model and arrange it inside your lot boundaries.</Text>

        <!-- Canvas -->
        <View style={styles.canvasContainer}>
          <View style={styles.canvas}>
            <!-- Main House Representation -->
            <View style={styles.mainHouse}>
              <Text style={styles.houseText}>Main House</Text>
            </View>
            
            <!-- Buildable Area Boundary -->
            <View style={styles.buildableZone}>
              <!-- ADU Block -->
              <View
                style={[
                  styles.aduBlock,
                  {
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: [{ rotate: `${rot}deg` }],
                    width: activeModel.footprint.widthFt * 1.5,
                    height: activeModel.footprint.depthFt * 1.5,
                  },
                ]}
              >
                <Text style={styles.aduText}>{activeModel.name}</Text>
              </View>
            </View>
          </View>

          <!-- Nudge Controls -->
          <View style={styles.controlPad}>
            <View style={styles.padRow}>
              <TouchableOpacity onPress={() => setPosY((y) => Math.max(10, y - 5))} style={styles.padBtn}>
                <Ionicons name="arrow-up" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.padRow}>
              <TouchableOpacity onPress={() => setPosX((x) => Math.max(10, x - 5))} style={styles.padBtn}>
                <Ionicons name="arrow-back" size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRot((r) => r + 15)} style={styles.padBtn}>
                <Ionicons name="refresh" size={16} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPosX((x) => Math.min(85, x + 5))} style={styles.padBtn}>
                <Ionicons name="arrow-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.padRow}>
              <TouchableOpacity onPress={() => setPosY((y) => Math.min(85, y + 5))} style={styles.padBtn}>
                <Ionicons name="arrow-down" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <!-- Model Selector -->
        <Text style={styles.sectionTitle}>Select ADU Footprint</Text>
        {aduModels.map((model) => {
          const isSelected = model.id === selectedModelId;
          return (
            <TouchableOpacity
              key={model.id}
              style={[styles.modelCard, isSelected && styles.modelCardSelected]}
              onPress={() => setSelectedModelId(model.id)}
            >
              <View style={styles.modelHeader}>
                <Text style={styles.modelName}>{model.name}</Text>
                <Text style={styles.modelPrice}>From ${model.priceFrom.toLocaleString()}</Text>
              </View>
              <Text style={styles.modelSpecs}>
                {model.sqft} sqft • {model.beds} Bed • {model.baths} Bath • {model.dimensions}
              </Text>
              {isSelected && (
                <View style={styles.selectedTick}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  <Text style={styles.selectedTickText}>Selected footprint</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <!-- Navigation Control Bar -->
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next: Style →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  subhead: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  canvasContainer: {
    marginBottom: spacing.lg,
  },
  canvas: {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: "#E5EEF4",
    borderWidth: 1,
    borderColor: "#A9C1D1",
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  mainHouse: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 100,
    height: 50,
    backgroundColor: "#D0DCE5",
    borderWidth: 1,
    borderColor: "#A3B7C7",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  houseText: {
    fontSize: 10,
    color: "#4E6678",
    fontWeight: "600",
  },
  buildableZone: {
    position: "absolute",
    bottom: 10,
    right: 10,
    left: 10,
    top: 70,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#2F5F80",
    borderRadius: 4,
  },
  aduBlock: {
    position: "absolute",
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
    marginLeft: -10,
    marginTop: -10,
  },
  aduText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  controlPad: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  padRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  padBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    ...shadows.soft,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  modelCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  modelCardSelected: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modelName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
  },
  modelPrice: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.accent,
  },
  modelSpecs: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedTick: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  selectedTickText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "bold",
  },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Run typecheck**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/wizard/step-2.tsx
  git commit -m "feat: implement step-2 model fit screen"
  ```

---

### Task 6: Implement Step 3: Style & AI Concept Screen

**Files:**
- Create: `app/wizard/step-3.tsx`

- [ ] **Step 1: Write step-3 screen code**
  Create [app/wizard/step-3.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/step-3.tsx) to capture visual preferences and trigger mockup generations:

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { designStyles } from "../../src/data/inspiration";
import { aduModels } from "../../src/data/aduModels";
import WizardHeader from "../../src/components/WizardHeader";
import { colors, typography, spacing, shadows } from "../../src/theme";
import { Ionicons } from "@expo/vector-icons";

export default function Step3Screen() {
  const router = useRouter();
  const project = useActiveProject();
  const { saveWizardStyle, createConcept, concepts } = useAppStore();

  const [selectedStyleId, setSelectedStyleId] = useState(designStyles[0].id);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project?.selectedStyleId) {
      setSelectedStyleId(project.selectedStyleId);
    }
  }, [project]);

  const activeStyle = designStyles.find((s) => s.id === selectedStyleId) || designStyles[0];
  const concept = concepts.find((c) => c.projectId === project?.id);

  const handleGenerateConcept = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const activeModel = aduModels.find((m) => m.id === project.selectedModelId) || aduModels[0];
      await createConcept(project.id, undefined, {
        styleId: selectedStyleId,
        styleLabel: activeStyle.label,
        modelId: activeModel.id,
        modelName: activeModel.name,
        constructionMethod: activeModel.constructionMethod,
        targetSqFt: activeModel.sqft,
        placement: project.placement,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (project) {
      await saveWizardStyle(project.id, selectedStyleId);
    }
    router.push("/wizard/step-4");
  };

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={3} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subhead}>Aesthetic Design & Concept</Text>
        <Text style={styles.body}>Select an architectural exterior design style to generate an AI visual concept.</Text>

        <!-- Style Rail Selector -->
        <Text style={styles.sectionTitle}>Choose Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail}>
          {designStyles.map((style) => {
            const isSelected = style.id === selectedStyleId;
            return (
              <TouchableOpacity
                key={style.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedStyleId(style.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {style.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          <Text style={styles.styleTitle}>{activeStyle.label}</Text>
          <Text style={styles.styleDesc}>{activeStyle.description}</Text>
        </View>

        <!-- AI concept Generator -->
        <View style={styles.conceptCard}>
          <Text style={styles.cardLabel}>AI DESIGN GENERATOR</Text>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Rendering concept...</Text>
            </View>
          ) : concept ? (
            <View>
              <Text style={styles.conceptTitle}>{concept.title}</Text>
              <Text style={styles.conceptStyle}>{concept.exteriorStyle} Style</Text>
              <View style={styles.divider} />
              <Text style={styles.conceptSpecs}>Layout: {concept.rooms.join(", ")}</Text>
              {concept.constraints.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.labelTitle}>Verified Codes:</Text>
                  {concept.constraints.map((c, i) => (
                    <Text key={i} style={styles.bullet}>✓ {c}</Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="sparkles-outline" size={32} color={colors.accent} />
              <Text style={styles.prompt}>Generate a custom visual schema detailing design specs.</Text>
              <TouchableOpacity style={styles.genBtn} onPress={handleGenerateConcept}>
                <Text style={styles.genText}>Generate Concept</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <!-- Navigation Control Bar -->
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next: ROI →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  subhead: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  rail: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  styleTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  styleDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  conceptCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 160,
    ...shadows.soft,
  },
  cardLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  prompt: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: 12,
  },
  genBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  genText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  conceptTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
  },
  conceptStyle: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  conceptSpecs: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  labelTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 12,
    color: colors.accent,
    marginBottom: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "bold",
  },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Run typecheck**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/wizard/step-3.tsx
  git commit -m "feat: implement step-3 design style concept screen"
  ```

---

### Task 7: Implement Step 4: ROI Model Screen

**Files:**
- Create: `app/wizard/step-4.tsx`

- [ ] **Step 1: Write step-4 screen code**
  Create [app/wizard/step-4.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/step-4.tsx) utilizing ROI models and input fields:

```typescript
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import { getEstimateDefaults, estimateAduValue } from "../../src/domain/estimator";
import WizardHeader from "../../src/components/WizardHeader";
import { colors, typography, spacing, shadows } from "../../src/theme";

export default function Step4Screen() {
  const router = useRouter();
  const project = useActiveProject();
  const { saveEstimate } = useAppStore();

  const defaults = getEstimateDefaults(project);
  const [rent, setRent] = useState(defaults.monthlyRent.toString());
  const [cost, setCost] = useState(defaults.buildCostPerSqFt.toString());

  const currentInput = {
    ...defaults,
    monthlyRent: Number(rent) || 0,
    buildCostPerSqFt: Number(cost) || 0,
  };

  const results = estimateAduValue(currentInput);

  const handleNext = async () => {
    if (project) {
      await saveEstimate(project.id, currentInput);
    }
    router.push("/wizard/step-5");
  };

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={4} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subhead}>ROI & Financial Forecast</Text>
        <Text style={styles.body}>Review cash flow projections, total construction estimates, and ROI metrics.</Text>

        <!-- Metric Grid -->
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Text style={styles.metricLabel}>EST. ADU VALUE</Text>
            <Text style={styles.metricValue}>
              ${(results.lowValue / 1000).toFixed(0)}k-${(results.highValue / 1000).toFixed(0)}k
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.metricLabel}>TOTAL PROJECT COST</Text>
            <Text style={styles.metricValue}>
              ${(results.totalCost / 1000).toFixed(0)}k
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Text style={styles.metricLabel}>ANNUAL CASH FLOW</Text>
            <Text style={styles.metricValue}>
              ${results.annualNOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.metricLabel}>ESTIMATED ROI</Text>
            <Text style={[styles.metricValue, { color: colors.accent }]}>
              {(results.roi * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        <!-- Assumptions Editor Card -->
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adjust Estimates</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Monthly Rent Estimate ($)</Text>
            <TextInput
              keyboardType="numeric"
              value={rent}
              onChangeText={setRent}
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Construction Cost Per SqFt ($)</Text>
            <TextInput
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
              style={styles.input}
            />
          </View>
        </View>
      </ScrollView>

      <!-- Navigation Control Bar -->
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next: Builders →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  subhead: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridCell: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.soft,
  },
  metricLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  cardTitle: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surfaceStrong,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "bold",
  },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Run typecheck**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/wizard/step-4.tsx
  git commit -m "feat: implement step-4 roi modeling screen"
  ```

---

### Task 8: Implement Step 5: Builder Matches Screen

**Files:**
- Create: `app/wizard/step-5.tsx`

- [ ] **Step 1: Write step-5 screen code**
  Create [app/wizard/step-5.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/wizard/step-5.tsx) representing contractor selections and completion triggers:

```typescript
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useActiveProject, useAppStore } from "../../src/state/appStore";
import WizardHeader from "../../src/components/WizardHeader";
import { colors, typography, spacing, shadows } from "../../src/theme";
import { Ionicons } from "@expo/vector-icons";

export default function Step5Screen() {
  const router = useRouter();
  const project = useActiveProject();
  const { contractorProfiles, requestQuote, quoteRequests } = useAppStore();

  const handleRequestQuote = async (contractorId: string, name: string) => {
    if (!project) return;
    await requestQuote(project.id, contractorId);
    Alert.alert("Quote Request Sent", `Your quote packet has been sent to ${name}.`);
  };

  const handleComplete = () => {
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <WizardHeader currentStep={5} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subhead}>Connect with Builders</Text>
        <Text style={styles.body}>Package your zoning, footprint, style, and ROI calculations to request bids.</Text>

        <!-- Quote Packet Card -->
        <View style={styles.card}>
          <Text style={styles.cardLabel}>GENERATED QUOTE PACKET</Text>
          <View style={styles.row}>
            <Ionicons name="document-text" size={20} color={colors.accent} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.docTitle}>ADU feasibility_packet.pdf</Text>
              <Text style={styles.docDetails}>Includes: Lot Summary, 2D Fit Sketch, ROI Model</Text>
            </View>
          </View>
        </View>

        <!-- Builders list -->
        <Text style={styles.sectionTitle}>Vetted Matches</Text>
        {contractorProfiles.map((builder) => {
          const isSent = quoteRequests.some(
            (q) => q.projectId === project?.id && q.contractorId === builder.id
          );
          return (
            <View key={builder.id} style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.builderName}>{builder.name}</Text>
                  <Text style={styles.builderSpecialty}>{builder.specialty}</Text>
                </View>
                <View style={styles.row}>
                  <Ionicons name="star" size={14} color="#FFB000" />
                  <Text style={styles.ratingText}>
                    {builder.rating} ({builder.reviews})
                  </Text>
                </View>
              </View>

              <Text style={styles.excerpt}>"{builder.reviewExcerpt}"</Text>

              <View style={styles.divider} />
              
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text style={styles.builderMeta}>Time: {builder.timelineWeeks}w</Text>
                <TouchableOpacity
                  style={[styles.quoteBtn, isSent && styles.quoteBtnSent]}
                  onPress={() => handleRequestQuote(builder.id, builder.name)}
                  disabled={isSent}
                >
                  <Text style={styles.quoteBtnText}>
                    {isSent ? "Request Sent ✓" : "Send Packet"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <!-- Navigation Control Bar -->
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.completeText}>Finish & Close ✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceStrong,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  subhead: {
    fontFamily: typography.editorial.fontFamily,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  cardLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.text,
  },
  docDetails: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  builderName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
  },
  builderSpecialty: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.text,
    marginLeft: 4,
  },
  excerpt: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.textSecondary,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  builderMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quoteBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  quoteBtnSent: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "bold",
  },
  completeBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  completeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
```

- [ ] **Step 2: Run typecheck**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/wizard/step-5.tsx
  git commit -m "feat: implement step-5 build matching screen"
  ```

---

### Task 9: Connect Home Tab to Wizard

**Files:**
- Modify: `app/(tabs)/index.tsx:120-150`

- [ ] **Step 1: Edit Home Screen router push logic**
  Open [app/(tabs)/index.tsx](file:///c:/Users/torra/Downloads/Repos/ADU%20Advisor/app/(tabs)/index.tsx). Modify the `handleStart` or `handleCreateProject` submit code:

```typescript
  const handleStartEstimate = async (address: string, jurisdiction: JurisdictionId) => {
    await createProject(address, jurisdiction);
    router.push("/wizard/step-1");
  };
```

- [ ] **Step 2: Run typecheck**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add app/(tabs)/index.tsx
  git commit -m "feat: route start estimate search to wizard step 1"
  ```

---

### Task 10: General Verification & Code Clean-up

- [ ] **Step 1: Verify all unit tests pass**
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 2: Run typescript checks across the entire codebase**
  Run: `npm run typecheck`
  Expected: PASS

- [ ] **Step 3: Shut down visual companion and clean directory**
  Add visual specs to git and remove temporary `.superpowers` session.
  Run:
  ```bash
  git add docs/superpowers/specs/
  git commit -m "docs: finalize visual specs"
  ```
