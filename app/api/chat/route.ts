import { forwardCoreRequest, isCoreProxyRequested } from "@/lib/chernobog/coreHost/coreProxy";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (isCoreProxyRequested()) return forwardCoreRequest(req, "/internal/chat");
  const { handleChatRequest } = await import("@/lib/chernobog/coreHost/chatService");
  return handleChatRequest(req);
}
