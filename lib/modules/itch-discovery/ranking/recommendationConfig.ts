export const DEFAULT_RECOMMENDATION_BATCH_SIZE = 20;
export const MAX_RECOMMENDATION_BATCH_SIZE = 200;
export const DEFAULT_RECOMMENDATION_TIMEZONE = "Europe/Dublin";

export const RECOMMENDATION_COMPONENT_CAPS = {
  tagMatch: 30,
  textMatch: 15,
  platformMatch: 10,
  priceMatch: 10,
  sourceQuality: 10,
  recency: 10,
  novelty: 5,
  feedbackAdjustment: 15,
} as const;

export const FEEDBACK_SIGNAL_WEIGHTS = {
  shown: 0,
  opened: 0.5,
  saved: 2.5,
  hidden: -3.5,
  played: 1.5,
  more_like_this: 4,
  less_like_this: -4,
} as const;
