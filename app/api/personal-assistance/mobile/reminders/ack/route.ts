import { forwardMobileCoreRequest, isCoreProxyRequested } from "@/lib/chernobog/coreHost/coreProxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  if (isCoreProxyRequested()) return forwardMobileCoreRequest(request, "/internal/mobile/reminders/ack");
  const { handleMobileReminderAck } = await import("@/lib/chernobog/coreHost/mobileHandlers");
  return handleMobileReminderAck(request);
}
