from pathlib import Path
import shutil,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
chat=root/'app/api/chat/route.ts'
if not chat.exists(): raise SystemExit(f'Run from Chernobog repository root: missing {chat}')
s=chat.read_text(encoding='utf-8-sig')
anchor='import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";'
if anchor not in s: raise SystemExit('FAIL CLOSED: expected auth import missing')
if 'executeGovernedMilestoneCommand' in s: raise SystemExit('Already installed; no changes made')
anchor2='    const result = await runLiveOh4CommandPipeline('
if s.count(anchor2)!=1: raise SystemExit('FAIL CLOSED: chat pipeline anchor ambiguous')
source=Path(__file__).with_name('governedMilestoneCommand.ts')
target=root/'lib/chernobog/pipeline/governedMilestoneCommand.ts'
if target.exists(): raise SystemExit('FAIL CLOSED: target adapter already exists')
insert='''    // OH5: intercept only deterministic, explicitly scoped test-milestone mutations.
    // Never allow a conversational response to impersonate a successful governed write.
    const governedReply = executeGovernedMilestoneCommand(userMessage, {
      authenticated: hasOwnerAuthorization(req.headers.get("authorization")),
      sessionId,
    });
    if (governedReply !== null) {
      return NextResponse.json({ ...buildUiPayload(sessionId, "memory", governedReply), memoryCitations: [] });
    }

'''
s=s.replace(anchor,anchor+'\nimport { executeGovernedMilestoneCommand } from "@/lib/chernobog/pipeline/governedMilestoneCommand";\nimport { buildUiPayload } from "@/lib/chernobog/pipeline/payload";')
s=s.replace(anchor2,insert+anchor2)
backup=chat.with_name(chat.name+'.oh5-backup')
if backup.exists(): raise SystemExit('FAIL CLOSED: backup exists; no changes made')
shutil.copy2(chat,backup)
target.write_bytes(source.read_bytes())
chat.write_text(s,encoding='utf-8')
print('Installed governed test milestone bridge. Original chat route backup:',backup)
