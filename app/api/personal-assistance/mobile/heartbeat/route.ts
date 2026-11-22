import { forwardMobileCoreRequest, isCoreProxyRequested } from "@/lib/chernobog/coreHost/coreProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  if (isCoreProxyRequested()) {
    return forwardMobileCoreRequest(request, "/internal/mobile/heartbeat");
  }
  const { handleMobileHeartbeatGet } = await import("@/lib/chernobog/coreHost/mobileHandlers");
  return handleMobileHeartbeatGet(request);
}

export async function POST(request: Request): Promise<Response> {
  if (isCoreProxyRequested()) {
    return forwardMobileCoreRequest(request, "/internal/mobile/heartbeat");
  }
  const { handleMobileHeartbeatPost } = await import("@/lib/chernobog/coreHost/mobileHandlers");
  return handleMobileHeartbeatPost(request);
}
