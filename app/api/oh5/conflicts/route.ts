import { NextResponse } from "next/server";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5ConflictManager } from "@/packages/vault/src/oh5/conflicts";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
export async function POST(request:Request){
  if(!hasOwnerAuthorization(request.headers.get("authorization")))return NextResponse.json({ok:false,error:"Owner authorization required"},{status:401,headers});
  let manager:OH5ConflictManager|undefined;
  try{
    const value:unknown=await request.json();
    if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Request object required");
    const body=value as Record<string,unknown>;
    if(typeof body.projectId!=="string")throw new Error("Project ID required");
    manager=new OH5ConflictManager(defaultOH5BDatabasePath(),defaultObsidianRoot());
    if(body.operation==="preview"&&typeof body.previousId==="string"&&typeof body.replacementId==="string"&&typeof body.reason==="string")
      return NextResponse.json({ok:true,review:manager.preview(body.projectId,body.previousId,body.replacementId,body.reason,true)},{headers});
    if(body.operation==="resolve"&&typeof body.challengeId==="string"&&typeof body.fingerprint==="string"&&typeof body.acknowledgement==="string"){
      const result=manager.resolve({projectId:body.projectId,challengeId:body.challengeId,fingerprint:body.fingerprint,acknowledgement:body.acknowledgement},true);
      return NextResponse.json({ok:true,previousId:result.previous.id,replacementId:result.replacement.id,previousTier:result.previous.tier},{headers});
    }
    if(body.operation==="history"&& (body.previousId===undefined||typeof body.previousId==="string"))
      return NextResponse.json({ok:true,items:manager.history(body.projectId,body.previousId as string|undefined)},{headers});
    if(body.operation==="suggest"&&typeof body.query==="string")
      return NextResponse.json({ok:true,candidates:manager.suggest(body.projectId,body.query)},{headers});
    return NextResponse.json({ok:false,error:"Unsupported operation"},{status:400,headers});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Conflict request failed"},{status:400,headers});}
  finally{manager?.close();}
}