import { UtilityEstimateCard } from "@lotfoundry/ui";

// An early site-work allowance for the utility trench to the backyard home.
export const Default = () => (
  <div className="w-[340px] border border-lot-line">
    <UtilityEstimateCard distanceFt={42.5} />
  </div>
);

export const LongRun = () => (
  <div className="w-[340px] border border-lot-line">
    <UtilityEstimateCard distanceFt={96} />
  </div>
);

export const CustomRates = () => (
  <div className="w-[340px] border border-lot-line">
    <UtilityEstimateCard distanceFt={42.5} lowRate={80} highRate={150} />
  </div>
);
