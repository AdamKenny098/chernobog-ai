import type { LearningPatternCandidate } from "./patternTypes";
export type LearningPromotionDecision = "promote" | "hold" | "reject";
export type LearningLessonStatus = "active" | "revoked";
export type LearningGovernanceAuthority = "system-policy" | "user-approved" | "operator-approved";
export interface LearningPromotionPolicy { minimumSupport:number; minimumConfidence:number; maximumContradictionRatio:number; requireExplicitApprovalForPreferences:boolean; requireExplicitApprovalForCorrections:boolean; }
export interface LearningPromotionContext { authority:LearningGovernanceAuthority; approved:boolean; approvedBy?:string; approvedAt?:string; }
export type LearningPromotionReasonCode = "support-sufficient"|"support-insufficient"|"confidence-sufficient"|"confidence-insufficient"|"contradiction-acceptable"|"contradiction-excessive"|"approval-required"|"approval-present"|"eligible-for-promotion";
export interface LearningPromotionReason { code:LearningPromotionReasonCode; detail:string; }
export interface LearningPromotionAssessment { patternKey:string; decision:LearningPromotionDecision; reasons:LearningPromotionReason[]; }
export interface LearnedLesson { id:string; key:string; kind:LearningPatternCandidate["kind"]; statement:string; status:LearningLessonStatus; confidence:number; supportCount:number; contradictionCount:number; promotedAt:string; revokedAt?:string; revocationReason?:string; governance:{authority:LearningGovernanceAuthority;approved:boolean;approvedBy?:string;approvedAt?:string}; evidence:LearningPatternCandidate["evidence"]; sourcePattern:LearningPatternCandidate; }
