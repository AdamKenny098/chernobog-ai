# Chernobog Phase 11 - Ollama HTTP 400 Diagnostic

Generated: 2026-08-31T22:24:01.5040418+01:00

Purpose: identify why normal routed response generation returns HTTP 400 before the 11I post-response learning hook can run.

Observed live failure:
- `respondForRoute()` reaches `callOllama()`
- shared Ollama client returns `ok=false` with `Ollama request failed with status 400`
- normal /api/chat returns HTTP 500
- post-response 11H -> 11I capture does not run because no reply was generated

This diagnostic does not modify production source.

## Ollama service/version

```json
{
    "version":  "0.32.15"
}
```

## Installed Ollama models

```json
{
    "models":  [
                   {
                       "name":  "qwen3:8b",
                       "model":  "qwen3:8b",
                       "modified_at":  "2026-08-12T01:49:58.0755161+01:00",
                       "size":  5225388164,
                       "digest":  "500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "qwen3",
                                       "families":  [
                                                        "qwen3"
                                                    ],
                                       "parameter_size":  "8.2B",
                                       "quantization_level":  "Q4_K_M",
                                       "context_length":  40960,
                                       "embedding_length":  4096
                                   },
                       "capabilities":  [
                                            "completion",
                                            "tools",
                                            "thinking"
                                        ]
                   },
                   {
                       "name":  "deepseek-coder-v2:16b",
                       "model":  "deepseek-coder-v2:16b",
                       "modified_at":  "2026-05-06T01:42:02.7913404+01:00",
                       "size":  8905126121,
                       "digest":  "63fb193b3a9b4322a18e8c6b250ca2e70a5ff531e962dbf95ba089b2566f2fa5",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "deepseek2",
                                       "families":  [
                                                        "deepseek2"
                                                    ],
                                       "parameter_size":  "15.7B",
                                       "quantization_level":  "Q4_0",
                                       "context_length":  163840,
                                       "embedding_length":  2048
                                   },
                       "capabilities":  [
                                            "completion",
                                            "insert"
                                        ]
                   },
                   {
                       "name":  "gemma3:latest",
                       "model":  "gemma3:latest",
                       "modified_at":  "2026-04-20T03:04:42.8422146+01:00",
                       "size":  3338801804,
                       "digest":  "a2af6cc3eb7fa8be8504abaf9b04e88f17a119ec3f04a3addf55f92841195f5a",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "gemma3",
                                       "families":  [
                                                        "gemma3"
                                                    ],
                                       "parameter_size":  "4.3B",
                                       "quantization_level":  "Q4_K_M"
                                   },
                       "capabilities":  [
                                            "completion"
                                        ]
                   },
                   {
                       "name":  "deepseek-coder:6.7b-instruct-q4_K_M",
                       "model":  "deepseek-coder:6.7b-instruct-q4_K_M",
                       "modified_at":  "2025-09-19T00:57:22.373623+01:00",
                       "size":  4083031689,
                       "digest":  "af6da0444f840521d9ea73f57c483cd6c90745d7ee24ef882a38d4688985f3f5",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "llama",
                                       "families":  [
                                                        "llama"
                                                    ],
                                       "parameter_size":  "7B",
                                       "quantization_level":  "Q4_K_M",
                                       "context_length":  16384,
                                       "embedding_length":  4096
                                   },
                       "capabilities":  [
                                            "completion"
                                        ]
                   },
                   {
                       "name":  "mistral:7b-instruct-q4_K_M",
                       "model":  "mistral:7b-instruct-q4_K_M",
                       "modified_at":  "2025-09-19T00:57:21.652768+01:00",
                       "size":  4369387754,
                       "digest":  "1a85656b534f84f8ab5b235aa0e24a954769539b0f47a4bd11f5272cba43c892",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "llama",
                                       "families":  [
                                                        "llama"
                                                    ],
                                       "parameter_size":  "7B",
                                       "quantization_level":  "Q4_K_M",
                                       "context_length":  32768,
                                       "embedding_length":  4096
                                   },
                       "capabilities":  [
                                            "completion"
                                        ]
                   },
                   {
                       "name":  "deepseek-coder:6.7b",
                       "model":  "deepseek-coder:6.7b",
                       "modified_at":  "2025-09-16T22:12:14.7203426+01:00",
                       "size":  3827834503,
                       "digest":  "ce298d984115b93bb1b191b47fee6b39e4e9fbd5f18e651c02f9fa74e0edcd13",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "llama",
                                       "families":  [
                                                        "llama"
                                                    ],
                                       "parameter_size":  "7B",
                                       "quantization_level":  "Q4_0",
                                       "context_length":  16384,
                                       "embedding_length":  4096
                                   },
                       "capabilities":  [
                                            "completion"
                                        ]
                   },
                   {
                       "name":  "mistral:latest",
                       "model":  "mistral:latest",
                       "modified_at":  "2025-08-30T23:19:31.2306379+01:00",
                       "size":  4372824384,
                       "digest":  "6577803aa9a036369e481d648a2baebb381ebc6e897f2bb9a766a2aa7bfbc1cf",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "llama",
                                       "families":  [
                                                        "llama"
                                                    ],
                                       "parameter_size":  "7.2B",
                                       "quantization_level":  "Q4_K_M",
                                       "context_length":  32768,
                                       "embedding_length":  4096
                                   },
                       "capabilities":  [
                                            "completion",
                                            "tools"
                                        ]
                   },
                   {
                       "name":  "deepseek-coder:latest",
                       "model":  "deepseek-coder:latest",
                       "modified_at":  "2025-07-14T23:40:30.1577536+01:00",
                       "size":  776080839,
                       "digest":  "3ddd2d3fc8d2b5fe039d18f859271132fd9c7960ef0be1864984442dc2a915d3",
                       "details":  {
                                       "parent_model":  "",
                                       "format":  "gguf",
                                       "family":  "llama",
                                       "families":  [
                                                        "llama"
                                                    ],
                                       "parameter_size":  "1B",
                                       "quantization_level":  "Q4_0",
                                       "context_length":  16384,
                                       "embedding_length":  2048
                                   },
                       "capabilities":  [
                                            "completion"
                                        ]
                   }
               ]
}
```

## Raw Ollama /api/chat minimal probes


### Gemma/default-family raw chat

- model: `gemma3:latest`
- HTTP status: 200
- elapsed ms: 310210

```json
{"model":"gemma3:latest","created_at":"2026-08-31T21:24:10.632534Z","message":{"role":"assistant","content":"OK."},"done":true,"done_reason":"stop","total_duration":8785179500,"load_duration":7085390400,"prompt_eval_count":24,"prompt_eval_duration":1673361000,"eval_count":3,"eval_duration":23066000}
```

### DeepSeek/planner-family raw chat

- model: `deepseek-coder-v2:16b`
- HTTP status: 200
- elapsed ms: 35045

```json
{"model":"deepseek-coder-v2:16b","created_at":"2026-08-31T21:29:47.0178503Z","message":{"role":"assistant","content":" OK"},"done":true,"done_reason":"stop","total_duration":34996859700,"load_duration":20606231000,"prompt_eval_count":18,"prompt_eval_duration":14237977000,"eval_count":2,"eval_duration":147947000}
```

## Shared Ollama client option/request construction

File: `lib\chernobog\llm\ollamaClient.ts`
Pattern: `function build|normalizeMessages|requestOptions|num_predict`

```text
   73: 
   74:   if (
   75:     "message" in value &&
   76:     value.message &&
   77:     typeof value.message === "object" &&
   78:     "content" in value.message &&
   79:     typeof value.message.content === "string" &&
   80:     value.message.content.trim().length > 0
   81:   ) {
   82:     return value.message.content.trim();
   83:   }
   84: 
   85:   return null;
   86: }
   87: 
>  88: function normalizeMessages(
   89:   messages: OllamaChatMessage[] | undefined,
   90: ): OllamaChatMessage[] | undefined {
   91:   if (!messages) {
   92:     return undefined;
   93:   }
   94: 
   95:   if (messages.length === 0) {
   96:     throw new Error("Ollama chat messages must not be empty.");
   97:   }
   98: 
   99:   return messages.map((message) => {
  100:     const content = message.content.trim();
  101: 
  102:     if (!content) {
  103:       throw new Error("Ollama chat message content must not be empty.");
  104:     }
  105: 
  106:     return {
  107:       role: message.role,
  108:       content,
  109:     };
  110:   });
  111: }
  112: 
  113: export function buildOllamaRequestPlan(
  114:   options: GenerateWithOllamaOptions,
  115:   model: string,
  116: ): OllamaRequestPlan {
  117:   const prompt = options.prompt?.trim();
  118:   const messages = normalizeMessages(options.messages);
  119: 
  120:   if (prompt && messages) {
  121:     throw new Error(
  122:       "Ollama request must use either prompt or messages, not both.",
  123:     );
  124:   }
  125: 
  126:   if (!prompt && !messages) {
  127:     throw new Error(
  128:       "Ollama request requires a prompt or chat messages.",
  129:     );
  130:   }
  131: 
  132:   const requestOptions: Record<string, unknown> = {
  133:     temperature: options.temperature ?? 0.35,
  134:   };
  135: 
  136:   if (options.numPredict !== undefined) {
  137:     if (
  138:       !Number.isInteger(options.numPredict) ||
  139:       options.numPredict < 1
  140:     ) {
  141:       throw new Error(
  142:         "Ollama numPredict must be a positive integer.",
  143:       );
  144:     }
  145: 
  146:     requestOptions.num_predict = options.numPredict;
  147:   }
  148: 
  149:   if (messages) {
  150:     return {
  151:       mode: "chat",
  152:       url: getOllamaChatUrl(),
  153:       inputChars: messages.reduce(
  154:         (total, message) => total + message.content.length,
  155:         0,
  156:       ),
  157:       body: {
  158:         model,
  159:         messages,
  160:         stream: false,
  161:         keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
  162:         ...(options.format ? { format: options.format } : {}),
  163:         options: requestOptions,
  164:       },
  165:     };
  166:   }
  167: 
  168:   return {
  169:     mode: "generate",
  170:     url: getOllamaGenerateUrl(),
  171:     inputChars: prompt!.length,
  172:     body: {
  173:       model,
  174:       prompt,
  175:       stream: false,
  176:       keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
  177:       ...(options.format ? { format: options.format } : {}),
  178:       options: requestOptions,
  179:     },
  180:   };
  181: }
  182: 
  183: function completeResult(
  184:   result: GenerateWithOllamaResult,
  185:   plan: OllamaRequestPlan | undefined,
  186:   startedAt: number,
  187: ): GenerateWithOllamaResult {
  188:   return {
```

## Shared Ollama client HTTP execution and non-OK handling

File: `lib\chernobog\llm\ollamaClient.ts`
Pattern: `response\.ok|request failed with status|status`

```text
   13: export type OllamaFailureKind =
   14:   | "invalid-request"
   15:   | "cancelled"
   16:   | "timeout"
   17:   | "http-error"
   18:   | "invalid-response"
   19:   | "transport-error";
   20: 
   21: export type GenerateWithOllamaOptions = {
   22:   role?: ModelRole;
   23:   prompt?: string;
   24:   messages?: OllamaChatMessage[];
   25:   format?: "json";
   26:   temperature?: number;
   27:   timeoutMs?: number;
   28:   keepAlive?: string;
   29:   numPredict?: number;
   30:   signal?: AbortSignal;
   31: 
   32:   /*
   33:    * Internal exact-model execution hook.
   34:    *
   35:    * Higher-level routing is responsible for choosing this model.
   36:    * The low-level transport does not invent or validate fallback policy.
   37:    */
   38:   modelOverride?: string;
   39: };
   40: 
   41: export type GenerateWithOllamaResult = {
   42:   ok: boolean;
   43:   text?: string;
   44:   model: string;
   45:   role: ModelRole;
   46:   error?: string;
   47:   failureKind?: OllamaFailureKind;
>  48:   httpStatus?: number;
   49:   endpoint?: string;
   50:   transport?: "generate" | "chat";
   51:   durationMs?: number;
   52: };
   53: 
   54: export type OllamaRequestPlan = {
   55:   mode: "generate" | "chat";
   56:   url: string;
   57:   body: Record<string, unknown>;
   58:   inputChars: number;
   59: };
   60: 
   61: function extractOllamaText(value: unknown): string | null {
   62:   if (!value || typeof value !== "object") {
   63:     return null;
   64:   }
   65: 
   66:   if (
   67:     "response" in value &&
   68:     typeof value.response === "string" &&
   69:     value.response.trim().length > 0
   70:   ) {
   71:     return value.response.trim();
   72:   }
   73: 
   74:   if (
   75:     "message" in value &&
   76:     value.message &&
   77:     typeof value.message === "object" &&
   78:     "content" in value.message &&
   79:     typeof value.message.content === "string" &&
   80:     value.message.content.trim().length > 0
   81:   ) {
   82:     return value.message.content.trim();
   83:   }
   84: 
   85:   return null;
   86: }
   87: 
   88: function normalizeMessages(
   89:   messages: OllamaChatMessage[] | undefined,
   90: ): OllamaChatMessage[] | undefined {
   91:   if (!messages) {
   92:     return undefined;
   93:   }
   94: 
   95:   if (messages.length === 0) {
   96:     throw new Error("Ollama chat messages must not be empty.");
   97:   }
   98: 
   99:   return messages.map((message) => {
  100:     const content = message.content.trim();
  101: 
  102:     if (!content) {
  103:       throw new Error("Ollama chat message content must not be empty.");
  104:     }
  105: 
  106:     return {
  107:       role: message.role,
  108:       content,
  109:     };
  110:   });
  111: }
  112: 
  113: export function buildOllamaRequestPlan(
  114:   options: GenerateWithOllamaOptions,
  115:   model: string,
  116: ): OllamaRequestPlan {
  117:   const prompt = options.prompt?.trim();
  118:   const messages = normalizeMessages(options.messages);
  119: 
  120:   if (prompt && messages) {
  121:     throw new Error(
  122:       "Ollama request must use either prompt or messages, not both.",
  123:     );
  124:   }
  125: 
  126:   if (!prompt && !messages) {
  127:     throw new Error(
  128:       "Ollama request requires a prompt or chat messages.",
  129:     );
  130:   }
  131: 
  132:   const requestOptions: Record<string, unknown> = {
  133:     temperature: options.temperature ?? 0.35,
  134:   };
  135: 
  136:   if (options.numPredict !== undefined) {
  137:     if (
  138:       !Number.isInteger(options.numPredict) ||
```

## Router callOllama response propagation

File: `lib\chernobog\router.ts`
Pattern: `async function callOllama`

```text
  174: };
  175: 
  176: function roleForRoute(route: RouteName): ModelRole {
  177:   return route === "planner"
  178:     ? "planner"
  179:     : "default";
  180: }
  181: 
> 182: async function callOllama(
  183:   messages: OllamaMessage[],
  184:   options: {
  185:     role?: ModelRole;
  186:     temperature?: number;
  187:     numPredict?: number;
  188:   } = {},
  189: ): Promise<string> {
  190:   const result = await generateWithOllama({
  191:     role: options.role ?? "default",
  192:     messages,
  193:     temperature: options.temperature ?? 0.4,
  194:     numPredict: options.numPredict ?? 500,
  195:   });
  196: 
  197:   if (!result.ok || !result.text) {
  198:     throw new Error(
  199:       result.error ??
  200:         "No response returned from the local model.",
  201:     );
  202:   }
  203: 
  204:   return result.text;
  205: }
  206: 
  207: function normalizeRoute(raw: string): RouteName {
  208:   const match = raw.toLowerCase().match(/\b(chat|planner|memory|tools|guardian)\b/);
  209:   return (match?.[1] as RouteName) ?? "chat";
  210: }
  211: 
  212: export async function routeMessage(userMessage: string): Promise<RouteName> {
  213:   const rawRoute = await callOllama(
  214:     [
  215:       { role: "system", content: ROUTER_PROMPT },
  216:       { role: "user", content: userMessage },
  217:     ],
  218:     {
  219:       role: "default",
  220:     },
  221:   );
  222: 
  223:   return normalizeRoute(rawRoute);
  224: }
  225: 
  226: export async function respondForRoute(
  227:   route: RouteName,
```

## Full routed response payload assembly

File: `lib\chernobog\router.ts`
Pattern: `export async function respondForRoute`

```text
  221:   );
  222: 
  223:   return normalizeRoute(rawRoute);
  224: }
  225: 
> 226: export async function respondForRoute(
  227:   route: RouteName,
  228:   userMessage: string,
  229:   context: ResponseContext = {}
  230: ): Promise<string> {
  231:   const messages: OllamaMessage[] = [
  232:     {
  233:       role: "system",
  234:       content: ROUTE_PROMPTS[route],
  235:     },
  236:   ];
  237: 
  238:   if (context.memories && context.memories.length > 0) {
  239:     messages.push({
  240:       role: "system",
  241:       content: [
  242:         "Persisted user memories:",
  243:         ...context.memories.map((memory) => `- ${memory}`),
  244:         "Use these only when relevant.",
  245:         "Never invent additional memories.",
  246:       ].join("\n"),
  247:     });
  248:   }
  249: 
  250:   if (context.sessionSummary) {
  251:     messages.push({
  252:       role: "system",
  253:       content: `Active short-term session context:\n${context.sessionSummary}`,
  254:     });
  255:   }
  256: 
  257:   if (context.recentMessages && context.recentMessages.length > 0) {
  258:     messages.push(...context.recentMessages);
  259:   }
  260: 
  261:   if (
  262:     context.sessionSummary &&
  263:     context.recentMessages &&
  264:     context.recentMessages.length > 0
  265:   ) {
  266:     messages.push({
  267:       role: "system",
  268:       content: [
  269:         "Authoritative context precedence:",
  270:         "The current runtime/session context supplied above is newer and more authoritative than earlier assistant statements in conversation history.",
  271:         "If an earlier assistant response conflicts with current runtime state, project state, scoped memory, or current user instructions, disregard the stale assistant response.",
  272:         "Do not repeat an earlier claim that information is missing when the current authoritative context now supplies that information.",
  273:       ].join("\n"),
  274:     });
  275:   }
  276: 
  277: 
  278: 
  279:   const worldModelReinforcement =
  280:     extractCriticalWorldModelReinforcement(
  281:       context.sessionSummary,
  282:     );
  283: 
  284:   if (worldModelReinforcement) {
  285:     messages.push({
  286:       role: "system",
  287:       content: worldModelReinforcement,
  288:     });
  289:   }
  290: 
  291: 
  292:   messages.push({
  293:     role: "user",
  294:     content: userMessage,
  295:   });
  296: 
  297:   const initialReply =
  298:     await callOllama(
  299:       messages,
  300:       {
  301:         role:
  302:           roleForRoute(route),
  303:         numPredict:
  304:           ROUTED_RESPONSE_NUM_PREDICT,
  305:       },
  306:     );
  307: 
  308:   if (
  309:     !shouldValidateWorldModelResponse(
  310:       userMessage,
  311:       context.sessionSummary,
  312:     )
  313:   ) {
  314:     return initialReply;
  315:   }
  316: 
  317:   const validation =
  318:     await validateWorldModelResponse(
  319:       userMessage,
  320:       initialReply,
  321:     );
  322: 
  323:   if (validation.valid) {
  324:     return initialReply;
  325:   }
  326: 
  327:   try {
  328:     const repairedReply =
  329:       await callOllama(
  330:         [
  331:           {
  332:             role: "system",
  333:             content: [
  334:               "You are the Chernobog grounded World Model response repair pass.",
  335:               "Repair only semantic grounding errors identified by the validator.",
  336:               "Canonical 11J evidence below is authoritative.",
  337:               "Do not execute tools or claim that any tool was executed.",
  338:             ].join("\n"),
  339:           },
  340:           {
  341:             role: "system",
  342:             content:
  343:               validation.canonicalEvidenceText,
  344:           },
  345:           {
  346:             role: "user",
  347:             content:
  348:               buildWorldModelRepairPrompt(
  349:                 userMessage,
  350:                 initialReply,
  351:                 validation,
```

## Ollama-related environment/config references

- `lib\chernobog\llm\ollamaClient.ts:3` - getOllamaChatUrl,
- `lib\chernobog\llm\ollamaClient.ts:4` - getOllamaGenerateUrl,
- `lib\chernobog\llm\ollamaClient.ts:6` - import { ModelRole, resolveModel } from "./modelRouter";
- `lib\chernobog\llm\ollamaClient.ts:8` - export type OllamaChatMessage = {
- `lib\chernobog\llm\ollamaClient.ts:13` - export type OllamaFailureKind =
- `lib\chernobog\llm\ollamaClient.ts:21` - export type GenerateWithOllamaOptions = {
- `lib\chernobog\llm\ollamaClient.ts:22` - role?: ModelRole;
- `lib\chernobog\llm\ollamaClient.ts:24` - messages?: OllamaChatMessage[];
- `lib\chernobog\llm\ollamaClient.ts:41` - export type GenerateWithOllamaResult = {
- `lib\chernobog\llm\ollamaClient.ts:45` - role: ModelRole;
- `lib\chernobog\llm\ollamaClient.ts:47` - failureKind?: OllamaFailureKind;
- `lib\chernobog\llm\ollamaClient.ts:54` - export type OllamaRequestPlan = {
- `lib\chernobog\llm\ollamaClient.ts:61` - function extractOllamaText(value: unknown): string | null {
- `lib\chernobog\llm\ollamaClient.ts:89` - messages: OllamaChatMessage[] | undefined,
- `lib\chernobog\llm\ollamaClient.ts:90` - ): OllamaChatMessage[] | undefined {
- `lib\chernobog\llm\ollamaClient.ts:96` - throw new Error("Ollama chat messages must not be empty.");
- `lib\chernobog\llm\ollamaClient.ts:103` - throw new Error("Ollama chat message content must not be empty.");
- `lib\chernobog\llm\ollamaClient.ts:113` - export function buildOllamaRequestPlan(
- `lib\chernobog\llm\ollamaClient.ts:114` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:116` - ): OllamaRequestPlan {
- `lib\chernobog\llm\ollamaClient.ts:122` - "Ollama request must use either prompt or messages, not both.",
- `lib\chernobog\llm\ollamaClient.ts:128` - "Ollama request requires a prompt or chat messages.",
- `lib\chernobog\llm\ollamaClient.ts:142` - "Ollama numPredict must be a positive integer.",
- `lib\chernobog\llm\ollamaClient.ts:152` - url: getOllamaChatUrl(),
- `lib\chernobog\llm\ollamaClient.ts:161` - keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
- `lib\chernobog\llm\ollamaClient.ts:170` - url: getOllamaGenerateUrl(),
- `lib\chernobog\llm\ollamaClient.ts:176` - keep_alive: options.keepAlive?.trim() || process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE?.trim() || "30m",
- `lib\chernobog\llm\ollamaClient.ts:184` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:185` - plan: OllamaRequestPlan | undefined,
- `lib\chernobog\llm\ollamaClient.ts:187` - ): GenerateWithOllamaResult {
- `lib\chernobog\llm\ollamaClient.ts:197` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:205` - nodeId: "ollama",
- `lib\chernobog\llm\ollamaClient.ts:215` - provider: "ollama",
- `lib\chernobog\llm\ollamaClient.ts:243` - "ollama",
- `lib\chernobog\llm\ollamaClient.ts:262` - role: ModelRole;
- `lib\chernobog\llm\ollamaClient.ts:263` - kind: OllamaFailureKind;
- `lib\chernobog\llm\ollamaClient.ts:265` - plan?: OllamaRequestPlan;
- `lib\chernobog\llm\ollamaClient.ts:269` - ): GenerateWithOllamaResult {
- `lib\chernobog\llm\ollamaClient.ts:284` - export function isRetryableOllamaFailure(
- `lib\chernobog\llm\ollamaClient.ts:285` - result: GenerateWithOllamaResult,
- `lib\chernobog\llm\ollamaClient.ts:312` - export async function generateWithOllama(
- `lib\chernobog\llm\ollamaClient.ts:313` - options: GenerateWithOllamaOptions,
- `lib\chernobog\llm\ollamaClient.ts:314` - ): Promise<GenerateWithOllamaResult> {
- `lib\chernobog\llm\ollamaClient.ts:321` - const resolved = resolveModel(role);
- `lib\chernobog\llm\ollamaClient.ts:335` - error: "Ollama modelOverride must not be empty.",
- `lib\chernobog\llm\ollamaClient.ts:355` - error: "Ollama timeoutMs must be greater than zero.",
- `lib\chernobog\llm\ollamaClient.ts:363` - let plan: OllamaRequestPlan;
- `lib\chernobog\llm\ollamaClient.ts:366` - plan = buildOllamaRequestPlan(
- `lib\chernobog\llm\ollamaClient.ts:378` - : "Invalid Ollama request.",
- `lib\chernobog\llm\ollamaClient.ts:391` - nodeId: "ollama",
- `lib\chernobog\llm\ollamaClient.ts:399` - provider: "ollama",
- `lib\chernobog\llm\ollamaClient.ts:425` - "ollama",
- `lib\chernobog\llm\ollamaClient.ts:435` - error: "Ollama request was cancelled before execution.",
- `lib\chernobog\llm\ollamaClient.ts:488` - `Ollama request failed with status ${response.status}.`,
- `lib\chernobog\llm\ollamaClient.ts:509` - ? `Ollama returned invalid JSON: ${error.message}`
- `lib\chernobog\llm\ollamaClient.ts:510` - : "Ollama returned invalid JSON.",
- `lib\chernobog\llm\ollamaClient.ts:520` - extractOllamaText(data);
- `lib\chernobog\llm\ollamaClient.ts:528` - "Ollama returned no usable text.",
- `lib\chernobog\llm\ollamaClient.ts:551` - const kind: OllamaFailureKind =
- `lib\chernobog\llm\ollamaClient.ts:560` - ? `Ollama request timed out after ${timeoutMs}ms.`
- `lib\chernobog\llm\ollamaClient.ts:562` - ? "Ollama request was cancelled."
- `lib\chernobog\llm\ollamaClient.ts:565` - : "Ollama request failed.";
- `lib\chernobog\llm\modelRouter.ts:4` - normalizeOllamaModelName,
- `lib\chernobog\llm\modelRouter.ts:7` - export type ModelRole =
- `lib\chernobog\llm\modelRouter.ts:14` - role: ModelRole;
- `lib\chernobog\llm\modelRouter.ts:28` - role: ModelRole;
- `lib\chernobog\llm\modelRouter.ts:44` - process.env[name];
- `lib\chernobog\llm\modelRouter.ts:62` - ModelRole = "default",
- `lib\chernobog\llm\modelRouter.ts:65` - readEnv("OLLAMA_MODEL") ??
- `lib\chernobog\llm\modelRouter.ts:70` - "OLLAMA_CODE_MODEL",
- `lib\chernobog\llm\modelRouter.ts:72` - readEnv("OLLAMA_MODEL") ??
- `lib\chernobog\llm\modelRouter.ts:83` - "OLLAMA_CODE_MODEL",
- `lib\chernobog\llm\modelRouter.ts:96` - "OLLAMA_CODE_MODEL",
- `lib\chernobog\llm\modelRouter.ts:109` - "OLLAMA_CODE_MODEL",
- `lib\chernobog\llm\modelRouter.ts:124` - "OLLAMA_MODEL",
- `lib\chernobog\llm\modelRouter.ts:147` - normalizeOllamaModelName(
- `lib\chernobog\llm\modelRouter.ts:170` - ModelRole = "default",
- `lib\chernobog\llm\modelRouter.ts:173` - resolveModel(role);

## Shared Chernobog generateWithOllama minimal probes

{
  "label": "default-role-minimal-chat",
  "role": "default",
  "elapsedMs": 9080,
  "result": {
    "ok": true,
    "text": "OK.",
    "model": "gemma3",
    "role": "default",
    "endpoint": "http://127.0.0.1:11434/api/chat",
    "transport": "chat",
    "durationMs": 9075
  }
}
{
  "label": "planner-role-minimal-chat",
  "role": "planner",
  "elapsedMs": 17054,
  "result": {
    "ok": true,
    "text": "OK",
    "model": "deepseek-coder-v2:16b",
    "role": "planner",
    "endpoint": "http://127.0.0.1:11434/api/chat",
    "transport": "chat",
    "durationMs": 17053
  }
}

- probe exit code: 0

## Decision matrix

A. Raw /api/chat fails for the installed default model:
- Ollama/model/runtime issue below Chernobog.
- use the raw error body and model tags to repair model availability/API compatibility first.

B. Raw /api/chat succeeds, but generateWithOllama minimal default-role probe fails:
- defect is in 11A shared client request construction/options/model resolution.
- repair 11A before returning to 11I.

C. Raw and shared-client minimal probes both succeed:
- defect is specific to the full routed response payload.
- next diagnostic should capture request metadata (model, message count, per-message role/character counts, options) and the exact Ollama non-OK response body without logging private message contents.

D. Default succeeds but planner fails:
- route/model-role resolution or planner model compatibility is the likely boundary.

E. Both minimal role probes succeed and full routed chat remains 400:
- do not alter 11I.
- inspect full response context size/schema and Ollama's raw 400 body.
