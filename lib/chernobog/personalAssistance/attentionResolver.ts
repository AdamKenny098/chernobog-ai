import type {
  CognitiveUserAttentionState,
} from "../cognition/initiativeTypes";
import {
  getPersonalAttentionSnapshot,
} from "./attentionStore";

export function resolvePersonalAttentionForCognition():
  CognitiveUserAttentionState {
  return getPersonalAttentionSnapshot()
    .state;
}