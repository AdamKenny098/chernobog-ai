import type {
  PersonalAttentionProvider,
  PersonalAttentionSnapshot as PublicPersonalAttentionSnapshot,
} from "@chernobog/contracts/personal-assistance";

import {
  getPersonalAttentionSnapshot,
} from "./attentionStore";

export const personalAttentionProvider:
  PersonalAttentionProvider = {
    getAttention():
      PublicPersonalAttentionSnapshot {
      const snapshot =
        getPersonalAttentionSnapshot();

      return {
        state:
          snapshot.state,
        effectiveUntil:
          snapshot.expiresAt,
        metadata: {
          source:
            snapshot.source,
          confidence:
            snapshot.confidence,
          explicit:
            snapshot.explicit,
          setAt:
            snapshot.setAt,
          reason:
            snapshot.reason,
          revision:
            snapshot.revision,
        },
      };
    },
  };
