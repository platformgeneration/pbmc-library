"use strict";

const CREATOR_STORAGE="pg-pbmc-creator-drafts-v1";
const WORKING_STORAGE="pg-pbmc-creator-working-v1";
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
    <div class="creator-question">${esc(question)}</div>
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
    <div class="creator-field" data-editor-field="core_value_unit.core_value_unit"><label>Core Value Unit <span class="char-count ${String(state.pbmc.core_value_unit.value||"").length>28?"over":""}" data-count-for="core-value-unit-value">${String(state.pbmc.core_value_unit.value||"").length} / 28</span></label><div class="creator-question">What is the fundamental unit of value exchanged on the platform? Aim for no more than two concepts.</div><input id="core-value-unit-value" data-path="pbmc.core_value_unit.value" data-soft-max="28" value="${esc(state.pbmc.core_value_unit.value)}" class="${String(state.pbmc.core_value_unit.value||"").length>28?"warn":""}" placeholder="e.g. Product Listing"><details class="field-note"><summary>Add explanation</summary><textarea data-path="pbmc.core_value_unit.explanation">${esc(state.pbmc.core_value_unit.explanation)}</textarea></details></div>
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

function bindTopActions(){
  qs("#saveDraft").addEventListener("click",saveDraft);qs("#newDraft").addEventListener("click",newDraft);qs("#downloadDraft").addEventListener("click",downloadJSON);qs("#exportPNG").addEventListener("click",exportPNG);qs("#exportSVG").addEventListener("click",exportSVG);qs("#exportPDF").addEventListener("click",exportPDF);
  qs("#draftSelect").addEventListener("change",e=>{if(e.target.value)openDraft(e.target.value);});
  qs("#importDraft").addEventListener("click",()=>qs("#importFile").click());qs("#importFile").addEventListener("change",e=>{const f=e.target.files[0];if(f)importJSON(f);e.target.value="";});
  const menu=qs("#mobileMenuToggle"),nav=qs("#siteNav");if(menu&&nav)menu.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
}

function init(){
  const recovered=storageGet(WORKING_STORAGE);if(recovered){try{state=normalizeImported(JSON.parse(recovered));setSaveState("Recovered browser autosave",true);}catch{}}
  renderEditor();renderCanvas();refreshDraftSelect();bindTopActions();
  window.addEventListener("beforeunload",()=>{try{storageSet(WORKING_STORAGE,JSON.stringify(state));}catch{}});
}
document.addEventListener("DOMContentLoaded",init);
