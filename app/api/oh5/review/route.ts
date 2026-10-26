import { NextResponse } from "next/server";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import { OH5ConfirmationGate } from "@/packages/vault/src/oh5/confirmation";
import { defaultOH5BDatabasePath } from "@/packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "@/packages/vault/src/oh5/layout";
export const runtime = "nodejs";
const noCache = {"Cache-Control":"no-store"};
export async function POST(request:Request){
  if(!hasOwnerAuthorization(request.headers.get("authorization")))return NextResponse.json({ok:false,error:"Owner authorization required"},{status:401,headers:noCache});
  let gate:OH5ConfirmationGate|undefined;
  try{
    const input:unknown=await request.json();
    if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Request object required");
    const body=input as Record<string,unknown>;
    gate=new OH5ConfirmationGate(defaultOH5BDatabasePath(),defaultObsidianRoot());
    if(body.operation==="queue" && typeof body.projectId==="string"){
      const records=gate.queue(body.projectId).map(r=>({id:r.id,projectId:r.projectId,revision:r.revision,sourceRef:r.sourceRef,channel:r.channel,body:r.body,tier:r.tier}));
      return NextResponse.json({ok:true,records},{headers:noCache});
    }
    if(body.operation==="preview" && typeof body.projectId==="string" && typeof body.memoryId==="string"){
      return NextResponse.json({ok:true,review:gate.preview(body.projectId,body.memoryId,true)},{headers:noCache});
    }
    if(body.operation==="decide" && typeof body.projectId==="string" && typeof body.memoryId==="string" && typeof body.nonce==="string" && typeof body.fingerprint==="string" && (body.action==="confirm"||body.action==="reject") && typeof body.reason==="string" && typeof body.acknowledgement==="string"){
      const record=gate.decide({projectId:body.projectId,memoryId:body.memoryId,nonce:body.nonce,fingerprint:body.fingerprint,action:body.action,reason:body.reason,acknowledgement:body.acknowledgement},true);
      return NextResponse.json({ok:true,id:record.id,projectId:record.projectId,tier:record.tier,revision:record.revision},{headers:noCache});
    }
    return NextResponse.json({ok:false,error:"Unsupported review operation"},{status:400,headers:noCache});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Review operation failed"},{status:400,headers:noCache});}
  finally{gate?.close();}
}