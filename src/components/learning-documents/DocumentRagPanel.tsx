"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { learningDocumentService as api } from "@/services/learningDocumentService";
import type { DocumentVersion, RetrievalResult } from "@/types/learning-document";

/** Explicit indexing and source retrieval preview. No automatic question generation. */
export function DocumentRagPanel({documentId,version,refresh,disabled}:{documentId:string;version:DocumentVersion;refresh:()=>void;disabled:boolean}) {
 const t=useTranslations("shared.learningDocuments");
 const [busy,setBusy]=useState(false);const lock=useRef(false);const [query,setQuery]=useState("");
 const [result,setResult]=useState<RetrievalResult|null>(null);
 const controller=useRef<AbortController|null>(null);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;controller.current?.abort();};},[]);
 const indexes=version.indexes??[];
 const pending=indexes.some(i=>i.status==="QUEUED"||i.status==="INDEXING");
 const run=async(operation:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);
   try{await operation();}catch{if(mounted.current)toast.error(t("failed"));}finally{lock.current=false;if(mounted.current){setBusy(false);refresh();}}
 };
 if(version.status!=="EXTRACTED")return null;
 return <section className="space-y-3 rounded border p-4">
   <h3 className="font-semibold">{t("rag.title")}</h3><p>{t("rag.disclosure")}</p>
   <Button disabled={disabled||busy||pending} onClick={()=>{void run(()=>api.index(documentId,version.id));}}>{t("rag.index")}</Button>
   {indexes.map(i=><div key={i.id} className="rounded border p-2"><p>{t(`rag.status.${i.status}`)} ({i.completed_chunks}/{i.chunk_count})</p>
     {i.error_code&&<p role="alert">{t("errorCode",{code:i.error_code})}</p>}
     {i.status==="FAILED"&&<Button disabled={disabled||busy} onClick={()=>{void run(()=>api.retryIndex(i.id));}}>{t("rag.retry")}</Button>}
   </div>)}
   <form className="space-y-2" onSubmit={e=>{e.preventDefault();if(!query.trim()||new TextEncoder().encode(query.trim()).length>1800){toast.error(t("invalid"));return;}
     setResult(null);void run(async()=>{const abort=new AbortController();controller.current=abort;const value=await api.retrieve(version.id,query.trim(),abort.signal);if(mounted.current&&!abort.signal.aborted)setResult(value);});}}>
     <Label htmlFor={`retrieval-${version.id}`}>{t("rag.query")}</Label>
     <Input id={`retrieval-${version.id}`} value={query} maxLength={1000} disabled={busy||disabled} onChange={e=>{setQuery(e.target.value);setResult(null);}} />
     <Button type="submit" disabled={busy||disabled||!indexes.some(i=>i.status==="READY")||!query.trim()}>{t("rag.search")}</Button>
   </form>
   {result&&<div className="space-y-2"><p role="status">{t("rag.unassessed")}</p>{result.chunks.map(c=><article key={c.chunk_id} className="rounded border p-3">
     <h4>{t(`kind.${c.kind}`,{position:c.position})} - {t("rag.similarity",{score:c.similarity.toFixed(3)})}</h4>
     <pre className="whitespace-pre-wrap break-words font-sans">{c.text}</pre>
   </article>)}</div>}
 </section>;
}
