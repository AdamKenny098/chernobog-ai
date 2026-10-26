import { NextResponse } from "next/server";
import { ControlledEvidenceIngress, type EvidenceEnvelope } from "@/packages/vault/src/oh5/ingestion";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!hasOwnerAuthorization(request.headers.get("authorization"))) return NextResponse.json({ok:false,error:"Owner authorization required"},{status:401,headers:{"Cache-Control":"no-store"}});
  let ingress: ControlledEvidenceIngress | undefined;
  try {
    const json: unknown = await request.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Evidence JSON object required");
    ingress = new ControlledEvidenceIngress(defaultOH5BDatabasePath(),defaultObsidianRoot());
    const receipt = ingress.ingest(json as EvidenceEnvelope);
    return NextResponse.json({ok:true,duplicate:receipt.duplicate,memoryId:receipt.record.id,tier:receipt.record.tier,projectId:receipt.record.projectId,fingerprint:receipt.fingerprint},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Evidence rejected"},{status:400,headers:{"Cache-Control":"no-store"}});
  } finally { ingress?.close(); }
}