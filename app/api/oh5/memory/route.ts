import { NextResponse } from "next/server";
import { GovernedMemoryStore, defaultOH5BDatabasePath, type OwnerDecision } from "@/packages/vault/src/oh5/store";
import { hasOwnerAuthorization } from "@/packages/vault/src/oh5/auth";
import type { InputChannel } from "@/packages/vault/src/oh5/governance";
export const runtime="nodejs";
const reply=(message:string,status=400)=>NextResponse.json({ok:false,error:message},{status,headers:{"Cache-Control":"no-store"}});
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("JSON object required");return value as Record<string,unknown>;}
function str(value:unknown,name:string):string{if(typeof value!=="string"||!value.trim())throw new Error(`${name} required`);return value.trim();}
function integer(value:unknown,name:string):number{if(typeof value!=="number"||!Number.isInteger(value)||value<1)throw new Error(`${name} must be a positive integer`);return value;}
export async function POST(request:Request){
  if(!hasOwnerAuthorization(request.headers.get("authorization")))return reply("Owner authorization required",401);
  let store:GovernedMemoryStore|undefined;
  try{
    const input=object(await request.json());const action=str(input.action,"action"),projectId=str(input.projectId,"projectId");
    store=new GovernedMemoryStore(defaultOH5BDatabasePath());
    let result:unknown;
    if(action==="ingest"){
      const channel=str(input.channel,"channel") as InputChannel;
      if(!["owner-ui","owner-voice","owner-cli","discord","email","notification","web","file","tool","model"].includes(channel))throw new Error("Invalid source channel");
      result=store.ingest({projectId,body:str(input.body,"body"),sourceRef:str(input.sourceRef,"sourceRef"),channel});
    }else if(action==="propose")result=store.propose({projectId,id:str(input.id,"id"),expectedRevision:integer(input.expectedRevision,"expectedRevision"),channel:"owner-ui"});
    else if(["confirm","reject","supersede","archive"].includes(action)){
      if(!Array.isArray(input.evidenceRefs)||input.evidenceRefs.some(v=>typeof v!=="string"))throw new Error("evidenceRefs string array required");
      result=store.ownerDecision({action:action as OwnerDecision["action"],projectId,id:str(input.id,"id"),expectedRevision:integer(input.expectedRevision,"expectedRevision"),reason:str(input.reason,"reason"),evidenceRefs:input.evidenceRefs as string[],approvalId:str(input.approvalId,"approvalId"),replacementId:typeof input.replacementId==="string"?input.replacementId:undefined},true);
    }else if(action==="recall")result=store.recall(projectId,str(input.query,"query"));
    else if(action==="list")result=store.list(projectId,{tiers:["raw","candidate","confirmed","superseded","rejected","archived"]});
    else if(action==="audit")result=store.audit(projectId,typeof input.id==="string"?input.id:undefined);
    else throw new Error("Unsupported action");
    return NextResponse.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return reply(error instanceof Error?error.message:"Unexpected error");}
  finally{store?.close();}
}