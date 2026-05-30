import type {
    ClassifiedDiscordMessage,
    DiscordIdeaFragment,
    DiscordMessageClassification,
    DiscordMessageKind,
    NormalizedDiscordMessage,
  } from "../types";
  import { extractIdeaFragments } from "./extractIdeaFragments";
  
  const CHATTER_PATTERNS = [
    /^(lol|lmao|haha|yeah|yep|nah|no|ok|okay|true|real|same|nice|cool)$/i,
    /^(thanks|thank you|cheers|gg|based)$/i,
  ];
  
  const BUG_PATTERNS = [
    /\bbug\b/i,
    /\bbroken\b/i,
    /\berror\b/i,
    /\bfailed\b/i,
    /\bfails\b/i,
    /\bfailing\b/i,
    /\bcrash(?:es|ed|ing)?\b/i,
    /\bissue\b/i,
    /\bnot working\b/i,
    /\bdoesn'?t work\b/i,
    /\bregression\b/i,
    /\bexception\b/i,
  ];
  
  const PROJECT_IDEA_PATTERNS = [
    /\bidea\b/i,
    /\bproject idea\b/i,
    /\bwhat if\b/i,
    /\bcould build\b/i,
    /\bcould make\b/i,
    /\bmaybe build\b/i,
    /\bwould be cool\b/i,
    /\bwould be sick\b/i,
    /\bprototype\b/i,
  ];
  
  const SHORT_PROJECT_NOUN_PATTERNS = [
    /\bapp\b/i,
    /\btool\b/i,
    /\btools\b/i,
    /\bbot\b/i,
    /\bagent\b/i,
    /\bassistant\b/i,
    /\bnotifier\b/i,
    /\bblocker\b/i,
    /\bmonitor\b/i,
    /\bmanager\b/i,
    /\bchecker\b/i,
    /\bscanner\b/i,
    /\btracer\b/i,
    /\bvisualizer\b/i,
    /\bgenerator\b/i,
    /\beditor\b/i,
    /\bdashboard\b/i,
    /\binspector\b/i,
    /\bdesigner\b/i,
    /\bplanner\b/i,
    /\bbuilder\b/i,
    /\bautomation\b/i,
    /\bsandbox\b/i,
    /\blauncher\b/i,
    /\borganizer\b/i,
    /\bcompare\b/i,
    /\bcomparer\b/i,
    /\bdiff\b/i,
    /\bsummarizer\b/i,
    /\bvalidator\b/i,
    /\bauditor\b/i,
  ];
  
  const TECH_PROJECT_CONTEXT_PATTERNS = [
    /\bai\b/i,
    /\bllm\b/i,
    /\bneural network\b/i,
    /\bunity\b/i,
    /\bdiscord\b/i,
    /\bcodebase\b/i,
    /\bcode\b/i,
    /\bgit\b/i,
    /\bvoxel\b/i,
    /\bschematic\b/i,
    /\bdungeon\b/i,
    /\bprocedural\b/i,
    /\basset\b/i,
    /\bscene\b/i,
    /\bgame\b/i,
    /\bgames\b/i,
    /\bttrpg\b/i,
    /\bdnd\b/i,
    /\bvault\b/i,
    /\bchernobog\b/i,
    /\bbiometric\b/i,
    /\bmedia\b/i,
    /\bcontent\b/i,
  ];
  
  const PROJECT_TITLE_PATTERNS = [
    /^[A-Z0-9][A-Za-z0-9 /+-]*(?:Tool|Tools|App|Bot|Assistant|Manager|Checker|Scanner|Tracer|Visualizer|Generator|Editor|Dashboard|Inspector|Designer|Planner|Builder|Notifier|Blocker|Sandbox|Launcher|Auditor|Summarizer|Validator)$/i,
    /^(?:AI|Unity|Discord|Code|Codebase|Smart|Local|Visual|Procedural|Prompt-to-|Asset|Game|Quest|Dialogue|Lore|README|Patch Notes|Dead Code|Refactor|Folder|Script|Git|Voxel|Schematic|Biometric)\b/i,
  ];
  
  const FEATURE_PATTERNS = [
    /\bfeature\b/i,
    /\badd support\b/i,
    /\bability to\b/i,
    /\bshould be able to\b/i,
    /\ballow\b/i,
    /\blet it\b/i,
    /\bmake it so\b/i,
    /\bintegrate\b/i,
    /\bconnected to\b/i,
    /\bsubroutine\b/i,
  ];
  
  const ARCHITECTURE_PATTERNS = [
    /\barchitecture\b/i,
    /\bmodule\b/i,
    /\bmodules\b/i,
    /\bmodular\b/i,
    /\bpipeline\b/i,
    /\bregistry\b/i,
    /\borchestration\b/i,
    /\bkernel\b/i,
    /\bcore\b/i,
    /\brefactor\b/i,
    /\badapter\b/i,
    /\bsubroutine\b/i,
  ];
  
  const DESIGN_PATTERNS = [
    /\bdesign\b/i,
    /\bui\b/i,
    /\bux\b/i,
    /\bvisual\b/i,
    /\blayout\b/i,
    /\btheme\b/i,
    /\bscreen\b/i,
    /\bpanel\b/i,
    /\bstyle\b/i,
    /\broom\b/i,
    /\balcove\b/i,
    /\bbed\b/i,
  ];
  
  const DECISION_PATTERNS = [
    /\bdecision\b/i,
    /\bdecided\b/i,
    /\blocked in\b/i,
    /\bfrom now on\b/i,
    /\bgoing forward\b/i,
    /\bwe will\b/i,
    /\bwe are going to\b/i,
    /\bshould be\b/i,
  ];
  
  const TASK_PATTERNS = [
    /\btodo\b/i,
    /\bto do\b/i,
    /\bneed to\b/i,
    /\bnext step\b/i,
    /\bimplement\b/i,
    /\bfix\b/i,
    /\badd\b/i,
    /\bremove\b/i,
    /\bpatch\b/i,
    /\bmake\b/i,
    /\bset up\b/i,
  ];
  
  function matchesAny(content: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(content));
  }
  
  function scoreMatches(content: string, patterns: RegExp[]): number {
    return patterns.reduce((score, pattern) => {
      return pattern.test(content) ? score + 1 : score;
    }, 0);
  }
  
  function isLikelyChatter(content: string): boolean {
    const cleaned = content.trim();
  
    if (!cleaned) {
      return true;
    }
  
    return CHATTER_PATTERNS.some((pattern) => pattern.test(cleaned));
  }
  
  function isLikelyProjectTitle(content: string): boolean {
    const cleaned = content.trim();
  
    if (!cleaned || cleaned.length > 140) {
      return false;
    }
  
    if (PROJECT_TITLE_PATTERNS.some((pattern) => pattern.test(cleaned))) {
      return true;
    }
  
    const hasProjectNoun = matchesAny(cleaned, SHORT_PROJECT_NOUN_PATTERNS);
    const hasTechContext = matchesAny(cleaned, TECH_PROJECT_CONTEXT_PATTERNS);
  
    return hasProjectNoun || hasTechContext;
  }

  function isToolLikeProjectTitle(content: string): boolean {
    const cleaned = content.trim();
  
    if (!cleaned || cleaned.length > 140) {
      return false;
    }
  
    const hasProjectNoun = matchesAny(cleaned, SHORT_PROJECT_NOUN_PATTERNS);
    const hasTitlePattern = PROJECT_TITLE_PATTERNS.some((pattern) =>
      pattern.test(cleaned)
    );
  
    return hasProjectNoun || hasTitlePattern;
  }
  
  function isVeryShortButUsefulIdea(content: string): boolean {
    const cleaned = content.trim();
  
    if (cleaned.length < 4 || cleaned.length > 100) {
      return false;
    }
  
    if (isLikelyChatter(cleaned)) {
      return false;
    }
  
    return isLikelyProjectTitle(cleaned);
  }
  
  function clampConfidence(value: number): number {
    return Math.max(0.1, Math.min(0.98, Number(value.toFixed(2))));
  }
  
  function guessProject(content: string): string | undefined {
    const lower = content.toLowerCase();
  
    if (
      /\bchernobog\b/.test(lower) ||
      /\bvault\b/.test(lower) ||
      /\bdiscord\b/.test(lower) ||
      /\bmodule\b/.test(lower) ||
      /\bpipeline\b/.test(lower) ||
      /\bsubroutine\b/.test(lower)
    ) {
      return "Chernobog";
    }
  
    if (
        /\bcode\b/.test(lower) ||
        /\bcodebase\b/.test(lower) ||
        /\bgit\b/.test(lower) ||
        /\bmerge\b/.test(lower) ||
        /\bdiff\b/.test(lower) ||
        /\brefactor\b/.test(lower) ||
        /\bscript\b/.test(lower) ||
        /\bdead code\b/.test(lower) ||
        /\bcleanup\b/.test(lower) ||
        /\breview\b/.test(lower)
      ) {
        return "Code / Codebase Tooling";
      }
      
      if (
        /\bunity\b/.test(lower) ||
        /\bdungeon\b/.test(lower) ||
        /\bgame\b/.test(lower) ||
        /\bgames\b/.test(lower) ||
        /\bplayer\b/.test(lower) ||
        /\bplaytester\b/.test(lower) ||
        /\bscene\b/.test(lower) ||
        /\basset\b/.test(lower)
      ) {
        return "Unity / Game Development";
      }
      
      if (
        /\bai\b/.test(lower) ||
        /\bllm\b/.test(lower) ||
        /\bneural network\b/.test(lower) ||
        /\bprompt\b/.test(lower) ||
        /\bvoxel\b/.test(lower) ||
        /\bschematic\b/.test(lower)
      ) {
        return "AI / Generative Tools";
      }
  
    if (/\b098\b/.test(lower) || /\bforge\b/.test(lower)) {
      return "098 Forge";
    }
  
    if (/\bwebsite\b/.test(lower) || /\bportfolio\b/.test(lower)) {
      return "098 Forge Website";
    }
  
    return undefined;
  }
  
  function buildTitleGuess(content: string): string {
    const cleaned = content
      .replace(/\s+/g, " ")
      .replace(/^idea\s*[:\-]\s*/i, "")
      .replace(/^project idea\s*[:\-]\s*/i, "")
      .replace(/^bug\s*[:\-]\s*/i, "")
      .trim();
  
    const words = cleaned.split(" ").slice(0, 9).join(" ");
  
    if (words.length <= 80) {
      return words;
    }
  
    return `${words.slice(0, 77)}...`;
  }
  
  function buildClassification(args: {
    kind: DiscordMessageKind;
    confidence: number;
    shouldKeep: boolean;
    content: string;
    reasoning: string[];
  }): DiscordMessageClassification {
    return {
      kind: args.kind,
      confidence: clampConfidence(args.confidence),
      shouldKeep: args.shouldKeep,
      titleGuess: args.shouldKeep ? buildTitleGuess(args.content) : undefined,
      projectGuess: args.shouldKeep ? guessProject(args.content) : undefined,
      reasoning: args.reasoning,
    };
  }
  
  function classifyFragmentContent(content: string): DiscordMessageClassification {
    const cleanedContent = content.trim();
  
    if (isVeryShortButUsefulIdea(cleanedContent)) {
        const hasArchitectureSignal = matchesAny(
          cleanedContent,
          ARCHITECTURE_PATTERNS
        );
        const hasDesignSignal = matchesAny(cleanedContent, DESIGN_PATTERNS);
        const hasFeatureSignal = matchesAny(cleanedContent, FEATURE_PATTERNS);
        const hasToolLikeTitle = isToolLikeProjectTitle(cleanedContent);
      
        const isExplicitArchitectureNote =
          hasArchitectureSignal &&
          /\b(module|modules|modular|registry|pipeline|orchestration|kernel|core|architecture|subroutine)\b/i.test(
            cleanedContent
          );
      
        if (hasToolLikeTitle && !isExplicitArchitectureNote) {
          return buildClassification({
            kind: "project_idea",
            confidence: 0.8,
            shouldKeep: true,
            content: cleanedContent,
            reasoning: [
              "short message looked like a named tool/app/project idea",
            ],
          });
        }
      
        if (isExplicitArchitectureNote) {
          return buildClassification({
            kind: "architecture_note",
            confidence: 0.76,
            shouldKeep: true,
            content: cleanedContent,
            reasoning: ["short message looked like an architecture or module note"],
          });
        }
      
        if (hasFeatureSignal) {
          return buildClassification({
            kind: "feature_request",
            confidence: 0.74,
            shouldKeep: true,
            content: cleanedContent,
            reasoning: ["short message looked like a feature request"],
          });
        }
      
        if (hasDesignSignal) {
          return buildClassification({
            kind: "design_note",
            confidence: 0.72,
            shouldKeep: true,
            content: cleanedContent,
            reasoning: ["short message looked like a design/tooling note"],
          });
        }
      
        return buildClassification({
          kind: "project_idea",
          confidence: 0.76,
          shouldKeep: true,
          content: cleanedContent,
          reasoning: ["short message looked like a compressed project/tool idea"],
        });
      }
  
    if (isLikelyChatter(cleanedContent)) {
      return buildClassification({
        kind: "ignore",
        confidence: 0.82,
        shouldKeep: false,
        content: cleanedContent,
        reasoning: ["message looked like short chatter or acknowledgement"],
      });
    }
  
    const bugScore = scoreMatches(cleanedContent, BUG_PATTERNS);
    const ideaScore = scoreMatches(cleanedContent, PROJECT_IDEA_PATTERNS);
    const featureScore = scoreMatches(cleanedContent, FEATURE_PATTERNS);
    const architectureScore = scoreMatches(cleanedContent, ARCHITECTURE_PATTERNS);
    const designScore = scoreMatches(cleanedContent, DESIGN_PATTERNS);
    const decisionScore = scoreMatches(cleanedContent, DECISION_PATTERNS);
    const taskScore = scoreMatches(cleanedContent, TASK_PATTERNS);
  
    if (bugScore > 0) {
      return buildClassification({
        kind: "bug_report",
        confidence: 0.78 + bugScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched bug/error/failure language"],
      });
    }
  
    if (decisionScore > 0) {
      return buildClassification({
        kind: "decision",
        confidence: 0.76 + decisionScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message sounded like a decision or future rule"],
      });
    }
  
    if (ideaScore > 0) {
      return buildClassification({
        kind: "project_idea",
        confidence: 0.74 + ideaScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched project idea language"],
      });
    }
  
    if (featureScore > 0) {
      return buildClassification({
        kind: "feature_request",
        confidence: 0.72 + featureScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched feature/request language"],
      });
    }
  
    if (architectureScore > 0) {
      return buildClassification({
        kind: "architecture_note",
        confidence: 0.7 + architectureScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched architecture/module/system language"],
      });
    }
  
    if (designScore > 0) {
      return buildClassification({
        kind: "design_note",
        confidence: 0.68 + designScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched design/interface language"],
      });
    }
  
    if (taskScore > 0) {
      return buildClassification({
        kind: "task",
        confidence: 0.68 + taskScore * 0.05,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message matched task/action language"],
      });
    }
  
    if (cleanedContent.endsWith("?")) {
      return buildClassification({
        kind: "question",
        confidence: 0.62,
        shouldKeep: true,
        content: cleanedContent,
        reasoning: ["message is a question that may need review"],
      });
    }
  
    if (cleanedContent.length >= 40) {
      return buildClassification({
        kind: "general_chatter",
        confidence: 0.48,
        shouldKeep: false,
        content: cleanedContent,
        reasoning: ["message had substance but no strong project signal yet"],
      });
    }
  
    return buildClassification({
      kind: "ignore",
      confidence: 0.72,
      shouldKeep: false,
      content: cleanedContent,
      reasoning: ["message did not contain a useful project signal"],
    });
  }
  
  export function classifyDiscordMessage(
    message: NormalizedDiscordMessage
  ): DiscordMessageClassification {
    if (message.isBot) {
      return buildClassification({
        kind: "ignore",
        confidence: 0.95,
        shouldKeep: false,
        content: message.content,
        reasoning: ["message was authored by a bot"],
      });
    }
  
    if (message.type !== 0) {
      return buildClassification({
        kind: "ignore",
        confidence: 0.88,
        shouldKeep: false,
        content: message.content,
        reasoning: [`unsupported Discord message type: ${message.type}`],
      });
    }
  
    return classifyFragmentContent(message.content);
  }
  
  function classifyDiscordFragment(
    message: NormalizedDiscordMessage,
    fragment: DiscordIdeaFragment
  ): ClassifiedDiscordMessage {
    if (message.isBot || message.type !== 0) {
      return {
        message,
        fragment,
        classification: classifyDiscordMessage(message),
      };
    }
  
    return {
      message,
      fragment,
      classification: classifyFragmentContent(fragment.content),
    };
  }
  
  export function classifyDiscordMessages(
    messages: NormalizedDiscordMessage[]
  ): ClassifiedDiscordMessage[] {
    return messages.flatMap((message) => {
      const fragments = extractIdeaFragments(message);
  
      return fragments.map((fragment) => classifyDiscordFragment(message, fragment));
    });
  }