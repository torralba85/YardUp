# ui

## Overview
Reusable user interface components and presentation widgets for ui.

## Interface
- `Bezel.tsx:BezelProps` - TypeScript Interface
- `Bezel.tsx:Bezel` - Exported constant / variable
- `BrandLockup.tsx:ParcelMark` - Exported Function
- `BrandLockup.tsx:BrandLockup` - Exported Function
- `Button.tsx:ButtonVariant` - Type Definition
- `Button.tsx:ButtonSize` - Type Definition
- `Button.tsx:ButtonProps` - TypeScript Interface
- `Button.tsx:Button` - Exported constant / variable
- `FeasibilityBadge.tsx:FeasibilityBadge` - Exported Function
- `Field.tsx:fieldControlClass` - Exported constant / variable
- `Field.tsx:Input` - Exported constant / variable
- `Field.tsx:Select` - Exported constant / variable
- `Field.tsx:Textarea` - Exported constant / variable
- `Field.tsx:FieldLabelProps` - TypeScript Interface
- `Field.tsx:FieldLabel` - Exported Function
- `Field.tsx:SegmentedOption` - TypeScript Interface
- `Field.tsx:SegmentedProps` - TypeScript Interface
- `Field.tsx:Segmented` - Exported Function
- `Field.tsx:SliderProps` - TypeScript Interface
- `Field.tsx:Slider` - Exported Function
- `MoneyFigure.tsx:MoneyFigureSize` - Type Definition
- `MoneyFigure.tsx:MoneyFigureTone` - Type Definition
- `MoneyFigure.tsx:MoneyFigureUnit` - Type Definition
- `MoneyFigure.tsx:MoneyFigureProps` - TypeScript Interface
- `MoneyFigure.tsx:MoneyFigure` - Exported Function
- `Panel.tsx:PanelHeadingLevel` - Type Definition
- `Panel.tsx:PanelHeaderProps` - TypeScript Interface
- `Panel.tsx:PanelHeader` - Exported Function
- `Skeleton.tsx:Skeleton` - Exported Function
- `StatusChip.tsx:StatusChipStatus` - Type Definition
- `StatusChip.tsx:StatusChipSize` - Type Definition
- `StatusChip.tsx:StatusChipProps` - TypeScript Interface
- `StatusChip.tsx:StatusChip` - Exported Function
- `StepRail.tsx:StepState` - Type Definition
- `StepRail.tsx:Step` - TypeScript Interface
- `StepRail.tsx:StepNavProps` - TypeScript Interface
- `StepRail.tsx:StepRail` - Exported Function
- `use-count-up.ts:useCountUp` - Exported Function
- `useRadioGroup.ts:RadioItemProps` - TypeScript Interface
- `useRadioGroup.ts:useRadioGroup` - Exported Function
- `UtilityEstimateCard.tsx:UtilityEstimateCard` - Exported Function

## Invariants
- None

## Side Effects
- `Field.tsx:refs.current[next.value]?.focus` - External call or state mutation
- `StepRail.tsx:refs.current[steps[i].id]?.focus` - External call or state mutation
- `useRadioGroup.ts:refs.current[next]?.focus` - External call or state mutation

## Verification
- Run: `npm test`
