import {
  getPersonalAttentionSnapshot,
} from "./attentionStore";

export function resolvePersonalAttentionForCognition() {
  return getPersonalAttentionSnapshot()
    .state;
}