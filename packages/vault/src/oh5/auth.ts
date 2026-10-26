import { timingSafeEqual } from "node:crypto";
/** Secret is configured by the local operator, never accepted from memory payloads. */
export function hasOwnerAuthorization(authorization:string|null,configured=process.env.CHERNOBOG_OH5_OWNER_TOKEN):boolean{
  if(!configured||configured.length<32||!authorization?.startsWith("Bearer "))return false;
  const supplied=Buffer.from(authorization.slice(7),"utf8");const expected=Buffer.from(configured,"utf8");
  return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
}