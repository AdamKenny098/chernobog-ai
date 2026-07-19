import type Database from "better-sqlite3";
import type { ItchNotificationDigest } from "../types";
import { createItchId, nowIso, parseJson, stringifyJson } from "../database/helpers";

type Row = { id:string; digest_date:string; timezone:string; title:string; body:string; item_count:number; notification_ids_json:string; state:"unread"|"read"; created_at:string; updated_at:string; read_at:string|null };
export class ItchNotificationDigestRepository {
  constructor(private readonly db: Database.Database) {}
  upsert(input: Omit<ItchNotificationDigest,"id"|"state"|"createdAt"|"updatedAt"|"readAt">): {digest: ItchNotificationDigest; created:boolean} {
    const existing=this.findByDate(input.digestDate); const ts=nowIso(); const id=existing?.id ?? createItchId("itch_digest");
    const result=this.db.prepare(`INSERT INTO itch_notification_digests (id,digest_date,timezone,title,body,item_count,notification_ids_json,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'unread',?,?) ON CONFLICT(digest_date) DO UPDATE SET timezone=excluded.timezone,title=excluded.title,body=excluded.body,item_count=excluded.item_count,notification_ids_json=excluded.notification_ids_json,updated_at=excluded.updated_at`)
      .run(id,input.digestDate,input.timezone,input.title,input.body,input.itemCount,stringifyJson(input.notificationIds),existing?.createdAt ?? ts,ts);
    return {digest:this.findByDate(input.digestDate)!,created:result.changes>0 && !existing};
  }
  findByDate(date:string):ItchNotificationDigest|null { const row=this.db.prepare(`SELECT * FROM itch_notification_digests WHERE digest_date=?`).get(date) as Row|undefined; return row?this.map(row):null; }
  list(limit=30):ItchNotificationDigest[]{ return (this.db.prepare(`SELECT * FROM itch_notification_digests ORDER BY digest_date DESC LIMIT ?`).all(limit) as Row[]).map(r=>this.map(r)); }
  markRead(id:string):ItchNotificationDigest|null { const ts=nowIso(); this.db.prepare(`UPDATE itch_notification_digests SET state='read',read_at=COALESCE(read_at,?),updated_at=? WHERE id=?`).run(ts,ts,id); const row=this.db.prepare(`SELECT * FROM itch_notification_digests WHERE id=?`).get(id) as Row|undefined; return row?this.map(row):null; }
  private map(r:Row):ItchNotificationDigest{return{id:r.id,digestDate:r.digest_date,timezone:r.timezone,title:r.title,body:r.body,itemCount:r.item_count,notificationIds:parseJson(r.notification_ids_json,[]),state:r.state,createdAt:r.created_at,updatedAt:r.updated_at,readAt:r.read_at??undefined};}
}
