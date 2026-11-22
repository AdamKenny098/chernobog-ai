import { forwardCoreRequest, isCoreProxyRequested } from "@/lib/chernobog/coreHost/coreProxy";
export const runtime = "nodejs";
export async function GET(req: Request) {
  if (isCoreProxyRequested()) return forwardCoreRequest(req, "/internal/session");
  const { handleSessionRequest } = await import("@/lib/chernobog/coreHost/sessionService");
  return handleSessionRequest(req);
}
