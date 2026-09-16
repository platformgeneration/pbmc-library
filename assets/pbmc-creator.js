"use strict";

const CREATOR_STORAGE="pg-pbmc-creator-drafts-v1";
const WORKING_STORAGE="pg-pbmc-creator-working-v1";
const AI_ENDPOINT_STORAGE="pg-pbmc-ai-endpoint-v1";
const AI_CLIENT_STORAGE="pg-pbmc-ai-client-v1";
const ROLE_CONFIG={
  owner:{label:"Owner",fields:["actor","job","gain","pain","transaction","governance","promotion_channel","activities","resources"]},
  consumer:{label:"Consumer",fields:["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"]},
  provider:{label:"Provider",fields:["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"]},
  partner:{label:"Partner",fields:["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"]}
};
const FIELD_META={
  actor:["Actor","Who is the actor in this role?"],job:["Job","What needs doing?"],gain:["Gain","What positive outcome matters?"],pain:["Pain","What gets in the way?"],transaction:["Transaction","What is exchanged?"],governance:["Governance","What rules govern participation?"],promotion_channel:["Promotion","How are participants attracted?"],filter:["Filter","Who gets access?"],access_channel:["Access","How is the platform accessed?"],activities:["Activities","What do they do?"],resources:["Resources","What must they contribute?"]
};
const ROLE_LABELS={owner:"Owner",consumer:"Consumer",provider:"Provider",partner:"Partner"};
const today=new Date();
const isoDate=d=>d.toISOString().slice(0,10);
const monthValue=d=>d.toISOString().slice(0,7);

function field(){return {value:"",explanation:""};}
function starterState(){
  const role=()=>({actor:field(),job:field(),gain:field(),pain:field(),transaction:field(),filter:field(),access_channel:field(),activities:field(),resources:field()});
  const owner=role(); delete owner.filter; delete owner.access_channel; owner.governance=field(); owner.promotion_channel=field();
  return {
    schema_version:"creator-1.0",
    metadata:{company:"Untitled platform",headline:""},
    creator:{name:"",organization:"",version:"1.0",created_date:isoDate(today)},
    rendering:{state:"after"},
    pbmc:{core_value_unit:field(),owner,consumer:role(),provider:role(),partner:{...role(),enabled:true},flows:[]}
  };
}

let state=starterState();
let currentDraftId=null;
let dirty=false;
let autosaveTimer=null;

function storageGet(key){try{return window.localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{window.localStorage.setItem(key,value);return true;}catch{return false;}}
function storageRemove(key){try{window.localStorage.removeItem(key);return true;}catch{return false;}}

const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
function deepClone(v){return JSON.parse(JSON.stringify(v));}
function getPath(obj,path){return path.split(".").reduce((o,k)=>o?.[k],obj);}
function setPath(obj,path,value){const bits=path.split(".");let o=obj;bits.slice(0,-1).forEach(k=>o=o[k]);o[bits.at(-1)]=value;}
function esc(s){return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
function slugify(s){return String(s||"pbmc").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"pbmc";}
function compactCreatedDate(){const d=String(state.creator.created_date||"").trim();return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:"undated";}
function filename(ext){return `${slugify(state.metadata.company)}-pbmc-${compactCreatedDate()}-v${String(state.creator.version||"1.0").replace(/^v/i,"")}.${ext}`;}

function normalizeImported(raw){
  const base=starterState();
  if(!raw||typeof raw!=="object")throw new Error("This is not a PBMC draft.");
  const merged=deepClone(base);
  Object.assign(merged.metadata,raw.metadata||{});
  Object.assign(merged.creator,raw.creator||{});
  if(raw.rendering)Object.assign(merged.rendering,raw.rendering);
  if(raw.pbmc?.core_value_unit)Object.assign(merged.pbmc.core_value_unit,raw.pbmc.core_value_unit);
  for(const role of Object.keys(ROLE_CONFIG)){
    if(raw.pbmc?.[role]){
      for(const key of ROLE_CONFIG[role].fields){if(raw.pbmc[role][key])Object.assign(merged.pbmc[role][key],raw.pbmc[role][key]);}
      if(role==="partner"&&raw.pbmc.partner.enabled!==undefined)merged.pbmc.partner.enabled=!!raw.pbmc.partner.enabled;
    }
  }
  merged.pbmc.flows=Array.isArray(raw.pbmc?.flows)?raw.pbmc.flows:(Array.isArray(raw.pbmc?.flows?.after)?raw.pbmc.flows.after:[]);
  return merged;
}

function fieldControl(role,key){
  const rec=state.pbmc[role][key]; const [label,question]=FIELD_META[key];
  const id=`${role}-${key}-value`; const max=key==="actor"?24:(key==="transaction"?30:28); const len=String(rec.value||"").length;
  return `<div class="creator-field" data-editor-field="${role}.${key}">
    <label for="${id}">${esc(label)} <span class="char-count ${len>max?"over":""}" data-count-for="${id}">${len} / ${max}</span></label>
    <div class="creator-question">${esc(question)} <button class="creator-field-ai" type="button" data-ai-path="pbmc.${role}.${key}.value" data-ai-label="${esc(ROLE_LABELS[role])} · ${esc(label)}">✦ Suggest</button></div>
    <input id="${id}" data-path="pbmc.${role}.${key}.value" data-soft-max="${max}" value="${esc(rec.value)}" autocomplete="off" class="${len>max?"warn":""}">
    <details class="field-note"><summary>Add explanation</summary><textarea data-path="pbmc.${role}.${key}.explanation" placeholder="Optional context saved with the editable draft">${esc(rec.explanation)}</textarea></details>
  </div>`;
}

function renderEditor(){
  const editor=qs("#creatorEditorBody");
  let html=`<details class="creator-section" open><summary>Canvas details</summary><div class="creator-section-body">
    <div class="creator-field"><label>Platform name</label><input data-path="metadata.company" value="${esc(state.metadata.company)}" placeholder="e.g. Alibaba.com"></div>
    <div class="creator-field"><label>Question / subtitle <span>optional</span></label><input data-path="metadata.headline" value="${esc(state.metadata.headline)}" placeholder="What does this platform enable?"></div>
    <div class="creator-grid-2">
      <div class="creator-field"><label>Version</label><input data-path="creator.version" value="${esc(state.creator.version)}" placeholder="1.0"></div>
      <div class="creator-field"><label>Created date</label><input type="date" data-path="creator.created_date" value="${esc(state.creator.created_date)}"></div>
      <div class="creator-field"><label>Creator name <span>optional</span></label><input data-path="creator.name" value="${esc(state.creator.name)}" placeholder="Your name"></div>
      <div class="creator-field"><label>Organisation <span>optional</span></label><input data-path="creator.organization" value="${esc(state.creator.organization)}" placeholder="Organisation / university / company"></div>
    </div>
  </div></details>`;

  html+=`<details class="creator-section" open data-section="core_value_unit"><summary>Core Value Unit</summary><div class="creator-section-body">
    <div class="creator-field" data-editor-field="core_value_unit.core_value_unit"><label>Core Value Unit <span class="char-count ${String(state.pbmc.core_value_unit.value||"").length>28?"over":""}" data-count-for="core-value-unit-value">${String(state.pbmc.core_value_unit.value||"").length} / 28</span></label><div class="creator-question">What is the fundamental unit of value exchanged on the platform? Aim for no more than two concepts. <button class="creator-field-ai" type="button" data-ai-path="pbmc.core_value_unit.value" data-ai-label="Core Value Unit">✦ Suggest</button></div><input id="core-value-unit-value" data-path="pbmc.core_value_unit.value" data-soft-max="28" value="${esc(state.pbmc.core_value_unit.value)}" class="${String(state.pbmc.core_value_unit.value||"").length>28?"warn":""}" placeholder="e.g. Product Listing"><details class="field-note"><summary>Add explanation</summary><textarea data-path="pbmc.core_value_unit.explanation">${esc(state.pbmc.core_value_unit.explanation)}</textarea></details></div>
  </div></details>`;

  for(const [role,cfg] of Object.entries(ROLE_CONFIG)){
    const checked=role!=="partner"||state.pbmc.partner.enabled!==false;
    html+=`<details class="creator-section" ${role==="owner"?"open":""} data-section="${role}"><summary><span><i class="role-dot role-${role}-dot"></i>${cfg.label}</span></summary><div class="creator-section-body">`;
    if(role==="partner")html+=`<div class="creator-toggle-row"><span>Include Partner role</span><input type="checkbox" data-special="partner-enabled" ${checked?"checked":""}></div>`;
    html+=cfg.fields.map(k=>fieldControl(role,k)).join("");
    html+=`</div></details>`;
  }

  html+=`<details class="creator-section" open data-section="flows"><summary>Transaction arrows</summary><div class="creator-section-body"><p class="creator-question">Add only the core transactions that make the platform work. Arrow routing follows the shared PBMC geometry automatically.</p><div class="flow-list" id="flowList"></div><button class="creator-btn add-flow" id="addFlow" type="button">+ Add transaction arrow</button></div></details>`;
  editor.innerHTML=html;
  renderFlows(); bindEditorEvents();
}

function roleOptions(selected){return Object.entries(ROLE_LABELS).map(([v,l])=>`<option value="${v}" ${v===selected?"selected":""}>${l}</option>`).join("");}
function renderFlows(){
  const list=qs("#flowList"); if(!list)return;
  if(!state.pbmc.flows.length){list.innerHTML='<div class="creator-question">No arrows yet. Add the few exchanges that are essential to the model.</div>';return;}
  list.innerHTML=state.pbmc.flows.map((f,i)=>`<div class="flow-row" data-flow-index="${i}"><div class="flow-row-grid"><select data-flow="from">${roleOptions(f.from)}</select><div class="flow-arrow-mini">→</div><select data-flow="to">${roleOptions(f.to)}</select></div><div class="flow-row-bottom"><input data-flow="value" value="${esc(f.value||"")}" placeholder="e.g. Payment / Data"><button class="flow-remove" type="button" aria-label="Remove arrow" title="Remove arrow">×</button></div></div>`).join("");
  qsa(".flow-row",list).forEach(row=>{
    const idx=Number(row.dataset.flowIndex);
    qsa("select,input",row).forEach(el=>el.addEventListener("input",()=>{state.pbmc.flows[idx][el.dataset.flow]=el.value;markChanged();renderCanvas();}));
    qs(".flow-remove",row).addEventListener("click",()=>{state.pbmc.flows.splice(idx,1);renderFlows();markChanged();renderCanvas();});
  });
}

function bindEditorEvents(){
  qsa("[data-path]",qs("#creatorEditorBody")).forEach(el=>el.addEventListener("input",()=>{
    setPath(state,el.dataset.path,el.value);
    const soft=Number(el.dataset.softMax||0); if(soft){
      const over=el.value.length>soft; el.classList.toggle("warn",over);
      const counter=qs(`[data-count-for="${el.id}"]`,qs("#creatorEditorBody"));
      if(counter){counter.textContent=`${el.value.length} / ${soft}`;counter.classList.toggle("over",over);}
    }
    markChanged(); renderCanvas();
  }));
  const partner=qs('[data-special="partner-enabled"]'); if(partner)partner.addEventListener("change",()=>{state.pbmc.partner.enabled=partner.checked;markChanged();renderCanvas();});
  qs("#addFlow")?.addEventListener("click",()=>{state.pbmc.flows.push({from:"consumer",to:"owner",value:"",explanation:""});renderFlows();markChanged();renderCanvas();});
  qsa("[data-ai-path]",qs("#creatorEditorBody")).forEach(btn=>btn.addEventListener("click",()=>openFieldSuggestion(btn.dataset.aiPath,btn.dataset.aiLabel)));
}

function renderCanvas(){
  try{
    window.PBMCRenderer.render(window.PBMCRenderer.normalizeCase(state));
    bindCanvasEditing();
  }catch(err){console.error(err);showToast("Canvas error: "+err.message);}
}
function bindCanvasEditing(){
  const svg=qs("#pbmcSvg"); if(!svg)return;
  svg.onclick=e=>{
    const actor=e.target.closest?.("[data-actor]");
    const fld=e.target.closest?.("[data-role][data-key]");
    let target=null,section=null;
    if(actor){section=actor.dataset.actor;target=qs(`#${section}-actor-value`);}
    else if(fld){
      const role=fld.dataset.role,key=fld.dataset.key;
      if(role==="core_value_unit"){section="core_value_unit";target=qs("#core-value-unit-value");}
      else {section=role;target=qs(`#${role}-${key}-value`);}
    }
    if(target){const details=qs(`[data-section="${section}"]`);if(details)details.open=true;target.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>target.focus(),250);}
  };
}

function markChanged(){
  dirty=true; setSaveState("Unsaved changes",false);
  clearTimeout(autosaveTimer); autosaveTimer=setTimeout(()=>{const ok=storageSet(WORKING_STORAGE,JSON.stringify(state));setSaveState(ok?"Autosaved on this device":"Download the draft to keep your work",ok);},500);
}
function setSaveState(text,saved){const el=qs("#saveState");el.textContent=text;el.classList.toggle("saved",!!saved);}
function drafts(){try{return JSON.parse(storageGet(CREATOR_STORAGE)||"{}");}catch{return {};}}
function saveDraft(){
  const all=drafts(); if(!currentDraftId)currentDraftId="d-"+Date.now();
  all[currentDraftId]={name:state.metadata.company||"Untitled PBMC",updatedAt:new Date().toISOString(),data:deepClone(state)};
  const ok=storageSet(CREATOR_STORAGE,JSON.stringify(all)); storageSet(WORKING_STORAGE,JSON.stringify(state));
  if(!ok){setSaveState("Browser storage unavailable — download the draft",false);showToast("Browser storage unavailable");return;}
  dirty=false;refreshDraftSelect();setSaveState("Saved in browser",true);showToast("Draft saved in this browser");
}
function refreshDraftSelect(){
  const sel=qs("#draftSelect");const all=drafts();const entries=Object.entries(all).sort((a,b)=>b[1].updatedAt.localeCompare(a[1].updatedAt));
  sel.innerHTML='<option value="">Saved drafts…</option>'+entries.map(([id,d])=>`<option value="${id}" ${id===currentDraftId?"selected":""}>${esc(d.name)} · ${new Date(d.updatedAt).toLocaleDateString()}</option>`).join("");
}
function openDraft(id){const d=drafts()[id];if(!d)return;state=normalizeImported(d.data);currentDraftId=id;dirty=false;renderEditor();renderCanvas();setSaveState("Opened saved draft",true);storageSet(WORKING_STORAGE,JSON.stringify(state));showToast("Draft opened");}
function newDraft(){if(dirty&&!confirm("Start a new PBMC? Unsaved changes will be replaced."))return;state=starterState();currentDraftId=null;dirty=false;storageRemove(WORKING_STORAGE);renderEditor();renderCanvas();refreshDraftSelect();setSaveState("New draft",true);}
function deleteDraft(id){const all=drafts();if(!all[id])return;if(!confirm(`Delete saved draft “${all[id].name}”?`))return;delete all[id];storageSet(CREATOR_STORAGE,JSON.stringify(all));if(currentDraftId===id)currentDraftId=null;refreshDraftSelect();showToast("Saved draft deleted");}

function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
function downloadJSON(){downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),filename("json"));showToast("Editable JSON draft downloaded");}
function importJSON(file){const r=new FileReader();r.onload=()=>{try{state=normalizeImported(JSON.parse(r.result));currentDraftId=null;dirty=true;renderEditor();renderCanvas();markChanged();showToast("Draft imported");}catch(e){alert("Could not import this draft: "+e.message);}};r.readAsText(file);}
function styleText(){let css="";for(const sheet of [...document.styleSheets]){try{for(const rule of [...sheet.cssRules])css+=rule.cssText+"\n";}catch{}}return css;}
function serializedSVG(){const svg=qs("#pbmcSvg");const clone=svg.cloneNode(true);clone.setAttribute("xmlns","http://www.w3.org/2000/svg");const style=document.createElementNS("http://www.w3.org/2000/svg","style");style.textContent=styleText();clone.insertBefore(style,clone.firstChild);return new XMLSerializer().serializeToString(clone);}
async function svgCanvas(scale=2){
  await document.fonts?.ready;
  const text=serializedSVG();const blob=new Blob([text],{type:"image/svg+xml;charset=utf-8"});const url=URL.createObjectURL(blob);const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});
  const canvas=document.createElement("canvas");canvas.width=1440*scale;canvas.height=960*scale;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);return canvas;
}
async function exportPNG(){try{const c=await svgCanvas(2);c.toBlob(b=>downloadBlob(b,filename("png")),"image/png");showToast("PNG downloaded");}catch(e){console.error(e);alert("PNG export failed in this browser.");}}
function exportSVG(){downloadBlob(new Blob([serializedSVG()],{type:"image/svg+xml;charset=utf-8"}),filename("svg"));showToast("SVG downloaded");}
async function exportPDF(){
  try{
    if(!window.jspdf?.jsPDF)throw new Error("PDF library not loaded");
    const canvas=await svgCanvas(2);const png=canvas.toDataURL("image/png",1);const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const pageW=297,pageH=210,margin=10,maxW=pageW-margin*2,maxH=pageH-margin*2;const ratio=1440/960;let w=maxW,h=w/ratio;if(h>maxH){h=maxH;w=h*ratio;}const x=(pageW-w)/2,y=(pageH-h)/2;
    pdf.addImage(png,"PNG",x,y,w,h,undefined,"FAST");pdf.setProperties({title:`${state.metadata.company} — Platform Business Model Canvas`,subject:"Platform Business Model Canvas",author:state.creator.name||"Platform Generation",creator:"Platform Generation PBMC Creator"});pdf.save(filename("pdf"));showToast("PDF downloaded");
  }catch(e){console.error(e);alert("PDF export could not start. Check your internet connection and try again.");}
}
function showToast(msg){const t=qs("#creatorToast");t.textContent=msg;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),2200);}


function syncEditorHeight(){
  const workbench=qs(".creator-workbench"), preview=qs(".creator-preview"), stage=qs(".creator-preview .canvas-stage");
  if(!workbench||!preview||!stage)return;
  const previewRect=preview.getBoundingClientRect();
  const stageRect=stage.getBoundingClientRect();
  const h=Math.max(360,Math.ceil(stageRect.height));
  const offset=Math.max(0,Math.round(stageRect.top-previewRect.top));
  workbench.style.setProperty("--creator-preview-height",`${h}px`);
  workbench.style.setProperty("--creator-editor-offset",`${offset}px`);
}
function setEditorWide(wide){
  const workbench=qs(".creator-workbench"),btn=qs("#editorSizeToggle");
  if(!workbench||!btn)return;
  workbench.classList.toggle("editor-wide",wide);
  btn.setAttribute("aria-expanded",String(wide));
  const label=qs(".creator-editor-size-label",btn);if(label)label.textContent=wide?"Collapse editor":"Expand editor";
  requestAnimationFrame(syncEditorHeight);
}
function bindEditorLayout(){
  const btn=qs("#editorSizeToggle"),workbench=qs(".creator-workbench"),preview=qs(".creator-preview");
  if(!btn||!workbench||!preview)return;
  btn.addEventListener("click",()=>setEditorWide(!workbench.classList.contains("editor-wide")));
  const ro=new ResizeObserver(()=>requestAnimationFrame(syncEditorHeight));
  ro.observe(preview);
  const stage=qs(".creator-preview .canvas-stage");
  if(stage)ro.observe(stage);
  window.addEventListener("resize",()=>requestAnimationFrame(syncEditorHeight),{passive:true});
  requestAnimationFrame(syncEditorHeight);
}


// --- PBMC Assistant -------------------------------------------------------
function getAIEndpoint(){return String(storageGet(AI_ENDPOINT_STORAGE)||window.PBMC_AI_ENDPOINT||"").trim().replace(/\/$/,"");}
function setAIEndpoint(url){const clean=String(url||"").trim().replace(/\/$/,"");if(clean)storageSet(AI_ENDPOINT_STORAGE,clean);else storageRemove(AI_ENDPOINT_STORAGE);return clean;}
function getAIClientId(){let id=storageGet(AI_CLIENT_STORAGE);if(!id){id=(crypto.randomUUID?.()||`pbmc-${Date.now()}-${Math.random().toString(36).slice(2)}`);storageSet(AI_CLIENT_STORAGE,id);}return id;}
function aiModal(){return qs("#pbmcAssistantModal");}
function aiBody(){return qs("#pbmcAssistantBody");}
function openAIModal(){const m=aiModal();if(!m)return;m.classList.add("show");m.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";}
function closeAIModal(){const m=aiModal();if(!m)return;m.classList.remove("show");m.setAttribute("aria-hidden","true");document.body.style.overflow="";}
function aiHome(){
  openAIModal();
  const body=aiBody();
  body.innerHTML=`<p class="creator-ai-intro">Use the PBMC methodology as a co-editor. Suggestions never overwrite your canvas until you accept them.</p>
  <div class="creator-ai-actions">
    <button class="creator-ai-action" type="button" data-ai-action="draft"><span class="ai-mark">✦</span><strong>Create a first draft</strong><span>Start from a platform, a question and optional notes.</span></button>
    <button class="creator-ai-action" type="button" data-ai-action="complete"><span class="ai-mark">✦</span><strong>Complete this PBMC</strong><span>Suggest useful values for gaps and weak fields without replacing your work automatically.</span></button>
    <button class="creator-ai-action" type="button" data-ai-action="review"><span class="ai-mark">✦</span><strong>Review this PBMC</strong><span>Check roles, CVU, transactions, partner logic and consistency.</span></button>
  </div>
  <div class="creator-ai-privacy">AI suggestions are advisory. Your current PBMC is sent to the configured Platform Generation AI endpoint only when you request assistance.</div>`;
  qsa("[data-ai-action]",body).forEach(btn=>btn.addEventListener("click",()=>aiActionForm(btn.dataset.aiAction)));
}
function aiActionTitle(action){return action==="draft"?"Create a first draft":action==="complete"?"Complete this PBMC":"Review this PBMC";}
function cleanPlatformName(){const name=String(state.metadata.company||"").trim();return name==="Untitled platform"?"":name;}
function aiActionForm(action){
  const body=aiBody();
  const endpoint=getAIEndpoint();
  body.innerHTML=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button>
    <p class="creator-ai-intro"><strong>${esc(aiActionTitle(action))}</strong><br>${action==="review"?"The assistant reviews the model you have already built. Add context only if something important is not visible in the canvas.":"Give the assistant just enough context to understand the platform. Concise notes are enough."}</p>
    <div class="creator-ai-form">
      <div><label>Platform / company</label><input id="aiPlatform" value="${esc(cleanPlatformName())}" placeholder="e.g. Airbnb"></div>
      <div><label>Question / focus <span>optional</span></label><input id="aiQuestion" value="${esc(state.metadata.headline||"")}" placeholder="What should this PBMC explain?"></div>
      <div><label>Context or notes <span>optional</span></label><textarea id="aiNotes" placeholder="Paste relevant facts, observations or assumptions here."></textarea></div>
      <div class="creator-ai-form-actions"><button class="creator-ai-btn" type="button" id="aiCancel">Cancel</button><button class="creator-ai-btn primary" type="button" id="aiRun">${action==="review"?"Review PBMC":"Generate suggestions"}</button></div>
    </div>
    ${endpoint?"":`<div class="creator-ai-setup" style="margin-top:16px"><h3>AI endpoint not connected yet</h3><p>Deploy the included PBMC Assistant Worker, then paste its URL here for this browser. The public site can later use the same URL through <code>assets/pbmc-ai-config.js</code>.</p><div class="creator-ai-setup-row"><input id="aiEndpointInput" placeholder="https://…workers.dev"><button class="creator-ai-btn" id="aiEndpointSave" type="button">Connect</button></div></div>`}`;
  qs("#aiBack")?.addEventListener("click",aiHome);qs("#aiCancel")?.addEventListener("click",closeAIModal);
  qs("#aiEndpointSave")?.addEventListener("click",()=>{const v=setAIEndpoint(qs("#aiEndpointInput")?.value);if(v){showToast("AI endpoint connected in this browser");aiActionForm(action);}});
  qs("#aiRun")?.addEventListener("click",()=>runAIAction(action));
}
async function callPBMCAI(action,extra={}){
  const endpoint=getAIEndpoint();
  if(!endpoint)throw new Error("The PBMC Assistant endpoint is not connected yet.");
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);
  try{
    const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-PBMC-Client":getAIClientId()},body:JSON.stringify({action,state,client_id:getAIClientId(),...extra}),signal:controller.signal});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false)throw new Error(data.error||`AI request failed (${res.status})`);
    return data.result||data;
  }catch(err){if(err.name==="AbortError")throw new Error("The assistant took too long to respond. Please try again.");throw err;}finally{clearTimeout(timer);}
}
async function runAIAction(action){
  const platform=String(qs("#aiPlatform")?.value||"").trim();const question=String(qs("#aiQuestion")?.value||"").trim();const notes=String(qs("#aiNotes")?.value||"").trim();
  if(action==="draft"&&!platform){qs("#aiPlatform")?.focus();return;}
  const body=aiBody();body.innerHTML=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><div class="creator-ai-loading"><span class="creator-ai-spinner"></span><span>${action==="review"?"Reviewing the PBMC logic…":"Building PBMC suggestions…"}</span></div>`;qs("#aiBack")?.addEventListener("click",aiHome);
  try{const result=await callPBMCAI(action,{context:{platform,question,notes}});if(action==="review")renderAIReview(result);else renderAISuggestions(result,action);}catch(err){renderAIError(err.message,action);}
}
function prettyPath(path){
  if(path==="pbmc.core_value_unit.value")return {group:"Core Value Unit",label:"Core Value Unit"};
  const m=String(path||"").match(/^pbmc\.(owner|provider|consumer|partner)\.([a-z_]+)\.value$/);if(!m)return {group:"Other",label:path};
  const role=ROLE_LABELS[m[1]]||m[1];const meta=FIELD_META[m[2]];return {group:role,label:meta?meta[0]:m[2].replaceAll("_"," ")};
}
function applyAISuggestion(s,rerender=true){
  if(!s||!s.path||typeof s.value!=="string")return false;try{setPath(state,s.path,s.value);const expPath=s.path.replace(/\.value$/,".explanation");if(s.explanation&&getPath(state,expPath)!==undefined)setPath(state,expPath,s.explanation);if(rerender){renderEditor();renderCanvas();markChanged();}return true;}catch{return false;}
}
function applyAIFlow(f){if(!f||!ROLE_LABELS[f.from]||!ROLE_LABELS[f.to]||!f.value)return false;const duplicate=state.pbmc.flows.some(x=>x.from===f.from&&x.to===f.to&&String(x.value).toLowerCase()===String(f.value).toLowerCase());if(!duplicate)state.pbmc.flows.push({from:f.from,to:f.to,value:f.value,explanation:f.reason||""});return !duplicate;}
function renderAISuggestions(result,action){
  const body=aiBody();const suggestions=Array.isArray(result.suggestions)?result.suggestions:[];const flows=Array.isArray(result.flows)?result.flows:[];const groups={};suggestions.forEach((s,i)=>{const p=prettyPath(s.path);(groups[p.group]??=[]).push({s,i,label:p.label});});
  let html=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><p class="creator-ai-summary">${esc(result.summary||`${suggestions.length} suggestions ready.`)}</p><div class="creator-ai-result-actions"><button class="creator-ai-btn primary" type="button" id="aiAcceptAll">Accept all suggestions</button></div>`;
  for(const [group,items] of Object.entries(groups)){html+=`<div class="creator-ai-group"><h3>${esc(group)}</h3>`+items.map(({s,i,label})=>`<div class="creator-ai-suggestion"><div><div class="creator-ai-suggestion-label">${esc(label)}${s.confidence?` <span class="creator-ai-confidence">${esc(s.confidence)}</span>`:""}</div><div class="creator-ai-suggestion-value">${esc(s.value)}</div>${s.explanation?`<div class="creator-ai-suggestion-reason">${esc(s.explanation)}</div>`:""}</div><button class="creator-ai-accept" type="button" data-ai-accept="${i}">Accept</button></div>`).join("")+`</div>`;}
  if(flows.length){html+=`<div class="creator-ai-group"><h3>Transaction arrows</h3>`+flows.map((f,i)=>`<div class="creator-ai-suggestion"><div><div class="creator-ai-suggestion-label">${esc(ROLE_LABELS[f.from]||f.from)} → ${esc(ROLE_LABELS[f.to]||f.to)}${f.confidence?` <span class="creator-ai-confidence">${esc(f.confidence)}</span>`:""}</div><div class="creator-ai-suggestion-value">${esc(f.value)}</div>${f.reason?`<div class="creator-ai-suggestion-reason">${esc(f.reason)}</div>`:""}</div><button class="creator-ai-accept" type="button" data-ai-flow="${i}">Accept</button></div>`).join("")+`</div>`;}
  body.innerHTML=html;qs("#aiBack")?.addEventListener("click",aiHome);
  qsa("[data-ai-accept]",body).forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.dataset.aiAccept);if(applyAISuggestion(suggestions[i])){btn.textContent="Accepted";btn.classList.add("done");btn.disabled=true;showToast("AI suggestion added");}}));
  qsa("[data-ai-flow]",body).forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.dataset.aiFlow);if(applyAIFlow(flows[i])){renderEditor();renderCanvas();markChanged();}btn.textContent="Accepted";btn.classList.add("done");btn.disabled=true;}));
  qs("#aiAcceptAll")?.addEventListener("click",()=>{suggestions.forEach(s=>applyAISuggestion(s,false));flows.forEach(applyAIFlow);renderEditor();renderCanvas();markChanged();qsa(".creator-ai-accept",body).forEach(b=>{b.textContent="Accepted";b.classList.add("done");b.disabled=true;});const all=qs("#aiAcceptAll");if(all){all.textContent="Suggestions accepted";all.disabled=true;}showToast("AI suggestions added to PBMC");});
}
function applyAIFlowReview(change){
  if(!change||!["add","replace","remove"].includes(change.action))return false;
  if(change.action==="add")return applyAIFlow(change);
  const idx=Number(change.target_index);
  if(!Number.isInteger(idx)||idx<0||idx>=state.pbmc.flows.length)return false;
  if(change.action==="remove"){state.pbmc.flows.splice(idx,1);return true;}
  if(!ROLE_LABELS[change.from]||!ROLE_LABELS[change.to]||!String(change.value||"").trim())return false;
  state.pbmc.flows[idx]={from:change.from,to:change.to,value:String(change.value).trim(),explanation:change.reason||""};
  return true;
}
function flowReviewLabel(change){
  const action=String(change.action||"").toLowerCase();
  if(action==="remove")return "Remove";
  if(action==="replace")return "Replace";
  return "Add";
}
function flowReviewDescription(change){
  const from=ROLE_LABELS[change.from]||change.from||"";const to=ROLE_LABELS[change.to]||change.to||"";
  return `${from} → ${to}${change.value?` · ${change.value}`:""}`;
}
function renderAIReview(result){
  const body=aiBody();const checks=Array.isArray(result.checks)?result.checks:[];const flowChanges=Array.isArray(result.transaction_changes)?result.transaction_changes:[];
  let html=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><p class="creator-ai-summary">${esc(result.summary||"PBMC review complete.")}</p>`;
  html+=checks.map((c,i)=>`<div class="creator-ai-review"><div class="creator-ai-review-top"><strong>${esc(c.title||"Review note")}</strong><span class="creator-ai-severity ${esc(c.severity||"consider")}">${esc(c.severity||"consider")}</span></div><p>${esc(c.message||"")}</p>${c.path&&c.suggested_value?`<button class="creator-ai-accept" type="button" data-review-apply="${i}">Apply: ${esc(c.suggested_value)}</button>`:""}</div>`).join("");
  if(flowChanges.length){html+=`<div class="creator-ai-group creator-ai-transaction-review"><h3>Transaction arrows</h3>`+flowChanges.map((c,i)=>`<div class="creator-ai-review"><div class="creator-ai-review-top"><strong>${esc(c.title||`${flowReviewLabel(c)} transaction`)}</strong><span class="creator-ai-severity ${esc(c.severity||"consider")}">${esc(c.severity||"consider")}</span></div><div class="creator-ai-flow-change"><span class="creator-ai-flow-action ${esc(c.action||"add")}">${esc(flowReviewLabel(c))}</span><span>${esc(flowReviewDescription(c))}</span></div><p>${esc(c.reason||"")}</p><button class="creator-ai-accept" type="button" data-review-flow="${i}">${esc(flowReviewLabel(c))}</button></div>`).join("")+`</div>`;}
  body.innerHTML=html;
  qs("#aiBack")?.addEventListener("click",aiHome);
  qsa("[data-review-apply]",body).forEach(btn=>btn.addEventListener("click",()=>{const c=checks[Number(btn.dataset.reviewApply)];if(applyAISuggestion({path:c.path,value:c.suggested_value,explanation:c.message})){btn.textContent="Applied";btn.classList.add("done");btn.disabled=true;}}));
  qsa("[data-review-flow]",body).forEach(btn=>btn.addEventListener("click",()=>{const c=flowChanges[Number(btn.dataset.reviewFlow)];if(applyAIFlowReview(c)){renderEditor();renderCanvas();markChanged();btn.textContent=c.action==="remove"?"Removed":c.action==="replace"?"Replaced":"Added";btn.classList.add("done");btn.disabled=true;showToast(`Transaction ${btn.textContent.toLowerCase()}`);}else{showToast("Transaction could not be changed");}}));
}
function renderAIError(message,action){const body=aiBody();body.innerHTML=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><div class="creator-ai-error"><strong>The assistant could not complete this request.</strong><br>${esc(message)}</div><div class="creator-ai-form-actions" style="margin-top:14px"><button class="creator-ai-btn primary" id="aiRetry" type="button">Try again</button></div>`;qs("#aiBack")?.addEventListener("click",aiHome);qs("#aiRetry")?.addEventListener("click",()=>aiActionForm(action));}
async function openFieldSuggestion(path,label){
  openAIModal();const body=aiBody();const current=String(getPath(state,path)||"");body.innerHTML=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><p class="creator-ai-intro"><strong>${esc(label||"Field suggestion")}</strong><br>Generate a few concise PBMC-style alternatives. Nothing is changed until you choose one.</p><div class="creator-ai-loading"><span class="creator-ai-spinner"></span><span>Thinking in PBMC logic…</span></div>`;qs("#aiBack")?.addEventListener("click",aiHome);
  try{const result=await callPBMCAI("suggest",{field:{path,label,current}});const suggestions=Array.isArray(result.suggestions)?result.suggestions:[];body.innerHTML=`<button class="creator-ai-back" type="button" id="aiBack">← PBMC Assistant</button><p class="creator-ai-summary">${esc(result.summary||label||"Choose a suggestion")}</p><div class="creator-ai-group">`+suggestions.map((s,i)=>`<div class="creator-ai-suggestion"><div><div class="creator-ai-suggestion-value">${esc(s.value)}</div>${s.reason?`<div class="creator-ai-suggestion-reason">${esc(s.reason)}</div>`:""}</div><button class="creator-ai-accept" type="button" data-field-suggestion="${i}">Use</button></div>`).join("")+`</div>`;qs("#aiBack")?.addEventListener("click",aiHome);qsa("[data-field-suggestion]",body).forEach(btn=>btn.addEventListener("click",()=>{const s=suggestions[Number(btn.dataset.fieldSuggestion)];if(applyAISuggestion({path,value:s.value,explanation:s.reason||""})){btn.textContent="Used";btn.classList.add("done");btn.disabled=true;showToast("Suggestion added");}}));}catch(err){renderAIError(err.message,"suggest");}
}
function bindPBMCAssistant(){
  qs("#pbmcAssistantOpen")?.addEventListener("click",aiHome);qs("#pbmcAssistantClose")?.addEventListener("click",closeAIModal);aiModal()?.addEventListener("pointerdown",e=>{if(e.target===aiModal())closeAIModal();});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&aiModal()?.classList.contains("show"))closeAIModal();});
}


function bindToolMenus(){
  const menus=[...document.querySelectorAll(".creator-tool-menu")];
  if(!menus.length)return;
  menus.forEach(menu=>{
    menu.addEventListener("toggle",()=>{
      if(menu.open)menus.forEach(other=>{if(other!==menu)other.removeAttribute("open");});
    });
    menu.addEventListener("click",e=>{
      if(e.target.closest(".creator-tool-item")) menu.removeAttribute("open");
    });
  });
  document.addEventListener("pointerdown",e=>{
    menus.forEach(menu=>{if(menu.open&&!menu.contains(e.target))menu.removeAttribute("open");});
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape")menus.forEach(menu=>menu.removeAttribute("open"));
  });
}

function bindTopActions(){
  qs("#saveDraft").addEventListener("click",saveDraft);qs("#newDraft").addEventListener("click",newDraft);qs("#downloadDraft").addEventListener("click",downloadJSON);qs("#exportPNG").addEventListener("click",exportPNG);qs("#exportSVG").addEventListener("click",exportSVG);qs("#exportPDF").addEventListener("click",exportPDF);
  qs("#draftSelect").addEventListener("change",e=>{if(e.target.value)openDraft(e.target.value);});
  qs("#importDraft").addEventListener("click",()=>qs("#importFile").click());qs("#importFile").addEventListener("change",e=>{const f=e.target.files[0];if(f)importJSON(f);e.target.value="";});
  const menu=qs("#mobileMenuToggle"),nav=qs("#siteNav");if(menu&&nav)menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
}

function init(){
  const recovered=storageGet(WORKING_STORAGE);if(recovered){try{state=normalizeImported(JSON.parse(recovered));setSaveState("Recovered browser autosave",true);}catch{}}
  renderEditor();renderCanvas();refreshDraftSelect();bindTopActions();bindToolMenus();bindEditorLayout();bindPBMCAssistant();
  window.addEventListener("beforeunload",()=>{try{storageSet(WORKING_STORAGE,JSON.stringify(state));}catch{}});
}
document.addEventListener("DOMContentLoaded",init);
