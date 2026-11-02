from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
route = root/'app/api/chat/route.ts'
bridge = root/'lib/chernobog/pipeline/governedMilestoneCommand.ts'
service = root/'lib/chernobog/pipeline/governedMemoryCommandService.ts'
if service.exists():
    raise SystemExit('Refusing to overwrite existing central service')
for f in (route,bridge):
    if not f.is_file(): raise SystemExit(f'Missing {f}')

oldroute = route.read_text(encoding='utf-8-sig')
oldbridge = bridge.read_text(encoding='utf-8-sig')
anchor_import = 'import { executeGovernedMilestoneCommand } from "@/lib/chernobog/pipeline/governedMilestoneCommand";'
anchor_call = 'const governedReply = executeGovernedMilestoneCommand(userMessage, {'
if oldroute.count(anchor_import)!=1 or oldroute.count(anchor_call)!=1:
    raise SystemExit('Chat route anchors missing or ambiguous; no changes made')
if 'export function executeGovernedMilestoneCommand(' not in oldbridge or 'export function parseGovernedMilestoneCommand(' not in oldbridge:
    raise SystemExit('Governed milestone bridge anchors missing; no changes made')

# Move the existing governed DB implementation into a single service; keep legacy API via re-export.
newservice = oldbridge.replace('export function parseGovernedMilestoneCommand(', 'export function parseGovernedMilestoneCommand(')
newservice = newservice.replace('const projectId = /\\b(?:for|under|of)\\s+(?:the\\s+)?Chernobog\\s+project\\b/i.test(text) || /\\bChernobog(?:\'s)?\\s+(?:next\\s+)?development milestone\\b/i.test(text)',
'''const projectId = /\\b(?:for|under|of)\\s+(?:the\\s+)?Chernobog(?:\\s+project|\\s+Phase\\s+\\d+)?\\b/i.test(text) || /\\bChernobog(?:'s)?\\s+(?:next\\s+)?development milestone\\b/i.test(text)''')
if newservice == oldbridge: raise SystemExit('Expected project parser anchor missing; no changes made')
# An explicit permanent milestone request that fails parsing is not allowed to fall through to legacy/tools.
newservice += '''
/** Explicit permanent milestone requests must not silently fall through to legacy routes. */
export function dispatchGovernedMemoryCommand(
  message: string,
  opts: { authenticated: boolean; sessionId: string; dbPath?: string; vaultRoot?: string },
): string | null {
  const parsed = parseGovernedMilestoneCommand(message);
  if (parsed) return executeGovernedMilestoneCommand(message, opts);
  const permanentVerb = /\\b(?:lock\\s+in|confirm|permanently\\s+(?:remember|save)|promote\\s+to\\s+(?:confirmed|permanent))\\b/i.test(message);
  const milestone = /\\b(?:milestone|memory)\\b/i.test(message);
  if (permanentVerb && milestone) {
    return "OH5 confirmation refused: permanent-memory command was not unambiguously resolved to a registered project and memory. No changes made.";
  }
  return null;
}
'''
newbridge = '''/** Compatibility re-exports. Governed writes are implemented in one service. */
export {
  parseGovernedMilestoneCommand,
  executeGovernedMilestoneCommand,
  dispatchGovernedMemoryCommand,
} from "./governedMemoryCommandService";
'''
newroute = oldroute.replace(anchor_import,'import { dispatchGovernedMemoryCommand } from "@/lib/chernobog/pipeline/governedMemoryCommandService";').replace(anchor_call,'const governedReply = dispatchGovernedMemoryCommand(userMessage, {')

# Only commit changes after all validation completes.
for f,old in ((route,oldroute),(bridge,oldbridge)):
    backup = f.with_suffix(f.suffix+'.oh5a-backup')
    if backup.exists(): raise SystemExit(f'Backup already exists: {backup}; no changes made')
for f,old in ((route,oldroute),(bridge,oldbridge)):
    f.with_suffix(f.suffix+'.oh5a-backup').write_text(old,encoding='utf-8')
service.write_text(newservice,encoding='utf-8')
bridge.write_text(newbridge,encoding='utf-8')
route.write_text(newroute,encoding='utf-8')
print('OH5-A central dispatch installed. Next: npx tsc --noEmit')
