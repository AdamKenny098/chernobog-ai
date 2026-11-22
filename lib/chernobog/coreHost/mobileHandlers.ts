/** OH-7B: Native Request/Response mobile handlers shared by desktop and core. */
import {
  authenticatePersonalAssistanceMobileRequest,
  getPersonalAssistanceMobileHealth,
  getPersonalAssistanceProfile,
  getPersonalAssistanceMobileTransportPolicy,
  recordPersonalAssistanceMobileHeartbeat,
  getPersonalAttentionSnapshot,
} from "@chernobog/personal-assistance";
import type { PersonalAssistanceMobileHeartbeatInput } from "@chernobog/personal-assistance";
import { liveAndroidReminderDeliveryService } from "@chernobog/personal-assistance/reminders/androidDelivery";

const HEADERS = { "Cache-Control": "no-store" };

export async function handleMobileHeartbeatGet(request: Request): Promise<Response> {
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    return Response.json({
      ok: true, device,
      health: getPersonalAssistanceMobileHealth(device.deviceId),
      transport: getPersonalAssistanceMobileTransportPolicy(),
    });
  } catch (error) {
    return Response.json({
      ok: false, error: "mobile_health_unauthorized",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 401 });
  }
}

export async function handleMobileHeartbeatPost(request: Request): Promise<Response> {
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    const profile = getPersonalAssistanceProfile();
    const notificationCaptureAllowed = profile.notification.capture !== "disabled";
    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("Request body must be a JSON object.");
    }
    const result = recordPersonalAssistanceMobileHeartbeat(
      device, body as PersonalAssistanceMobileHeartbeatInput,
    );
    return Response.json({
      ok: true, result,
      transport: getPersonalAssistanceMobileTransportPolicy(),
      capabilities: {
        heartbeat: true,
        notificationApiAvailable: true,
        notificationCaptureMode: profile.notification.capture,
        notificationIngest: notificationCaptureAllowed,
        offlineSpoolUpload: notificationCaptureAllowed,
        toolExecution: false,
        permissionGranting: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unauthorized = /authorization|bearer|credential|revoked/i.test(message);
    return Response.json({
      ok: false,
      error: unauthorized ? "mobile_heartbeat_unauthorized" : "mobile_heartbeat_invalid",
      message,
    }, { status: unauthorized ? 401 : 400 });
  }
}

export async function handleMobileReminderClaim(request: Request): Promise<Response> {
  let authenticated = false;
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    authenticated = true;
    const service = await liveAndroidReminderDeliveryService();
    const claim = service.claim(
      device.deviceId, getPersonalAttentionSnapshot(), getPersonalAssistanceProfile(),
    );
    return Response.json({ ok: true, claim }, { headers: HEADERS });
  } catch {
    return Response.json({
      ok: false, error: authenticated ? "reminder_claim_rejected" : "mobile_unauthorized",
    }, { status: authenticated ? 400 : 401, headers: HEADERS });
  }
}

export async function handleMobileReminderAuthorize(request: Request) {
  let authenticated = false;
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    authenticated = true;
    const input = await request.json() as Record<string, unknown>;
    const service = await liveAndroidReminderDeliveryService();
    const authorized = service.authorize(
      device.deviceId,
      typeof input?.reminderId === "string" ? input.reminderId : "",
      typeof input?.reservationId === "string" ? input.reservationId : "",
      getPersonalAttentionSnapshot(), getPersonalAssistanceProfile(),
    );
    return Response.json({ ok: true, authorized }, { headers: HEADERS });
  } catch {
    // Do not expose token values, SQL details, reminder titles, or device identifiers.
    return Response.json(
      { ok: false, error: authenticated ? "reminder_authorize_rejected" : "mobile_unauthorized" },
      { status: authenticated ? 400 : 401, headers: HEADERS },
    );
  }
}


export async function handleMobileReminderAck(request: Request) {
  let authenticated = false;
  try {
    const device = authenticatePersonalAssistanceMobileRequest(request);
    authenticated = true;
    const input = await request.json() as Record<string, unknown>;
    const service = await liveAndroidReminderDeliveryService();
    const result = service.acknowledge(
      device.deviceId,
      typeof input?.reminderId === "string" ? input.reminderId : "",
      typeof input?.reservationId === "string" ? input.reservationId : "",
      typeof input?.receipt === "string" ? input.receipt : "",
    );
    return Response.json({ ok: true, result }, { headers: HEADERS });
  } catch {
    // Do not expose token values, SQL details, reminder titles, or device identifiers.
    return Response.json(
      { ok: false, error: authenticated ? "reminder_ack_rejected" : "mobile_unauthorized" },
      { status: authenticated ? 400 : 401, headers: HEADERS },
    );
  }
}
