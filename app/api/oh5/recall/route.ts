import { NextResponse } from "next/server";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5RecallService } from "@/packages/vault/src/oh5/recall";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
export async function POST(request:Request){
  if(!hasOwnerAuthorization(request.headers.get("authorization")))return NextResponse.json({ok:false,error:"Owner authorization required"},{status:401,headers});
  let service:OH5RecallService|undefined;
  try {
    const raw:unknown=await request.json();
    if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid request");
    const b=raw as Record<string,unknown>;
    service=new OH5RecallService(defaultOH5BDatabasePath(),defaultObsidianRoot());
    if(b.operation==="search"&&typeof b.projectId==="string"&&typeof b.query==="string")
      return NextResponse.json({ok:true,hits:service.search({projectId:b.projectId,query:b.query,limit:b.limit as number|undefined})},{headers});
    if(b.operation==="history"&&typeof b.projectId==="string"&&typeof b.memoryId==="string")
      return NextResponse.json({ok:true,result:service.history(b.projectId,b.memoryId,true)},{headers});
    if(b.operation==="cross-project"&&Array.isArray(b.projectIds)&&typeof b.query==="string"&&typeof b.reason==="string")
      return NextResponse.json({ok:true,result:service.searchAcrossProjects({projectIds:b.projectIds as string[],query:b.query,reason:b.reason,limit:b.limit as number|undefined},true)},{headers});
    if(b.operation==="cross-project-audit")return NextResponse.json({ok:true,items:service.crossProjectAudit(true)},{headers});
    return NextResponse.json({ok:false,error:"Unsupported recall operation"},{status:400,headers});
  } catch(error) { return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Recall failed"},{status:400,headers}); }
  finally { service?.close(); }
}
