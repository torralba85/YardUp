# adu

## Overview
Domain modeling, utility functions, and calculation engines for adu.

## Interface
- `content.ts:ADU_CITIES` - Exported constant / variable
- `content.ts:aduCounties` - Exported Function
- `content.ts:ADU_COST_PAGES` - Exported constant / variable
- `content.ts:cityUrl` - Exported Function
- `content.ts:costPageUrl` - Exported Function
- `content.ts:costPagePath` - Exported Function
- `content.ts:hubUrl` - Exported Function
- `content.ts:stateCostPath` - Exported Function
- `content.ts:stateCostUrl` - Exported Function
- `content.ts:METHODOLOGY_AS_OF` - Exported constant / variable
- `content.ts:methodologyPath` - Exported Function
- `content.ts:methodologyUrl` - Exported Function
- `content.ts:calculatorUrl` - Exported Function
- `content.ts:rentPath` - Exported Function
- `content.ts:rentUrl` - Exported Function
- `content.ts:rentCsvPath` - Exported Function
- `content.ts:rentCsvUrl` - Exported Function
- `content.ts:jaduPath` - Exported Function
- `content.ts:jaduUrl` - Exported Function
- `content.ts:permitStudyPath` - Exported Function
- `content.ts:permitStudyUrl` - Exported Function
- `content.ts:permitStudyCsvPath` - Exported Function
- `content.ts:permitStudyCsvUrl` - Exported Function
- `content.ts:aduStaticParams` - Exported Function
- `content.ts:getCity` - Exported Function
- `content.ts:aduCostStaticParams` - Exported Function
- `content.ts:getCostPage` - Exported Function
- `content.ts:getCoveringCostPage` - Exported Function
- `content.ts:getNeighbors` - Exported Function
- `content.ts:buildCityMetadata` - Exported Function
- `content.ts:buildCostMetadata` - Exported Function
- `content.ts:wordCount` - Exported Function
- `content.ts:pageWordSplit` - Exported Function
- `content.ts:cityDiffersWordCount` - Exported Function
- `content.ts:renderedText` - Exported Function
- `content.ts:STATE_BASELINE_AS_OF` - Re-exported symbol
- `market-aggregate.ts:CITY_MARKET_SIZES` - Exported constant / variable
- `market-aggregate.ts:RENT_SCENARIO_SPREADS` - Re-exported symbol
- `market-aggregate.ts:HUD_FMR_AS_OF` - Exported constant / variable
- `market-aggregate.ts:CalculatorCounty` - TypeScript Interface
- `market-aggregate.ts:CALCULATOR_COUNTIES` - Exported constant / variable
- `market-aggregate.ts:CitySizeAggregate` - TypeScript Interface
- `market-aggregate.ts:CityMarketAggregate` - TypeScript Interface
- `market-aggregate.ts:cityMarketAggregate` - Exported Function
- `market-aggregate.ts:countyMarketAggregate` - Exported Function
- `market-aggregate.ts:AduEstimateInput` - TypeScript Interface
- `market-aggregate.ts:estimateAdu` - Exported Function
- `market-aggregate.ts:countyProvenance` - Exported Function
- `types.ts:AduSource` - TypeScript Interface
- `types.ts:AduConfidence` - Type Definition
- `types.ts:AduCtaPlacement` - Type Definition
- `types.ts:aduCtaEvent` - Exported Function
- `types.ts:AduGlanceRow` - TypeScript Interface
- `types.ts:AduFaq` - TypeScript Interface
- `types.ts:AduContentSection` - TypeScript Interface
- `types.ts:AduProcessStep` - TypeScript Interface
- `types.ts:JurisdictionContent` - TypeScript Interface
- `types.ts:JurisdictionCostContent` - TypeScript Interface

## Invariants
- `market-aggregate.ts:throw` - new Error(`No verified HUD rent row for ${slug}`)

## Side Effects
- None

## Verification
- Run: `npm test`
