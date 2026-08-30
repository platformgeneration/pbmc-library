"use strict";

const NS="http://www.w3.org/2000/svg";
const ROLE_COLORS={owner:"#78A9FF",provider:"#E7B43E",consumer:"#F07C55",partner:"#59B978"};
const ROLES=["owner","provider","consumer","partner"];
const ROLE_NAMES={owner:"OWNER",provider:"PROVIDER",consumer:"CONSUMER",partner:"PARTNER"};

const FIELD_LABELS={
  governance:"Governance",promotion_channel:"Promotion",activities:"Activities",
  resources:"Resources",transaction:"Transaction",gain:"Gain",job:"Job",
  pain:"Pain",filter:"Filter",access_channel:"Access"
};
const QUESTIONS={
  governance:"What rules govern participation?",
  promotion_channel:"How are participants attracted?",
  activities:"What do they do?",
  resources:"What must they contribute?",
  transaction:"What is exchanged?",
  gain:"What positive outcome matters?",
  job:"What needs doing?",
  pain:"What gets in the way?",
  filter:"Who gets access?",
  access_channel:"How is the platform accessed?",
  core_value_unit:"What unit of value is exchanged?"
};

/* Fixed PBMC spatial grammar. Only content changes. */
const GEOM={
  outer:{x:8,y:8,w:1424,h:920},
  cvu:{x:580,y:393,w:280,h:150},
  actors:{
    owner:{x:720,roleY:74,valueY:100},
    provider:{x:106,roleY:456,valueY:482},
    consumer:{x:1334,roleY:456,valueY:482},
    partner:{x:720,roleY:824,valueY:850}
  },
  fields:{
    owner:{
      governance:[489,139,108,62],promotion_channel:[607,139,108,62],
      activities:[725,139,108,62],resources:[843,139,108,62],
      transaction:[489,215,462,62],gain:[541,295,108,64],
      job:[666,295,108,64],pain:[791,295,108,64]
    },
    provider:{
      filter:[192,329,104,62],access_channel:[192,401,104,62],
      activities:[192,473,104,62],resources:[192,545,104,62],
      transaction:[318,351,86,234],gain:[422,353,108,64],
      job:[422,436,108,64],pain:[422,519,108,64]
    },
    consumer:{
      gain:[910,353,108,64],job:[910,436,108,64],pain:[910,519,108,64],
      transaction:[1036,351,86,234],filter:[1144,329,104,62],
      access_channel:[1144,401,104,62],activities:[1144,473,104,62],
      resources:[1144,545,104,62]
    },
    partner:{
      gain:[541,577,108,64],job:[666,577,108,64],pain:[791,577,108,64],
      transaction:[489,659,462,62],resources:[489,735,108,62],
      activities:[607,735,108,62],access_channel:[725,735,108,62],
      filter:[843,735,108,62]
    }
  }
};

/*
  Every directed role pair is a normal route.
  The four "long" opposite routes are NOT special/demo routes:
  owner↔partner use the left/right Job↔Transaction corridors;
  provider↔consumer use the top/bottom Job↔Transaction corridors.
*/
const ROUTES={
  "owner>provider":   {d:"M489 239 L361 239 L361 351", label:[397,319]},
  "provider>owner":   {d:"M361 351 L361 271 L489 271", label:[425,263]},
  "consumer>owner":   {d:"M1079 351 L1079 239 L951 239", label:[1088,231]},
  "owner>consumer":   {d:"M951 271 L1079 271 L1079 351", label:[1043,319]},
  "partner>provider": {d:"M489 690 L361 690 L361 585", label:[397,621]},
  "provider>partner": {d:"M361 585 L361 674 L489 674", label:[425,666]},
  "consumer>partner": {d:"M1079 585 L1079 674 L951 674", label:[1015,666]},
  "partner>consumer": {d:"M951 690 L1079 690 L1079 585", label:[1043,621]},

  "owner>partner":    {d:"M489 246 L413 246 L413 690 L489 690", label:[448,702]},
  "partner>owner":    {d:"M951 690 L1027 690 L1027 246 L951 246", label:[992,234]},
  "provider>consumer":{d:"M361 351 L361 286 L1079 286 L1079 351", label:[950,298]},
  "consumer>provider":{d:"M1079 585 L1079 650 L361 650 L361 585", label:[490,638]}
};

const STRUCTURE={
  owner:`M720 393 L720 363
M720 363 L595 363 L595 359
M720 363 L720 359
M720 363 L845 363 L845 359
M720 295 L720 277
M720 215 L720 207
M543 207 L897 207
M543 207 L543 201 M661 207 L661 201 M779 207 L779 201 M897 207 L897 201`,
  provider:`M580 468 L538 468
M538 385 L538 551 M538 385 L530 385 M538 468 L530 468 M538 551 L530 551
M422 468 L404 468 M318 468 L306 468
M306 360 L306 576 M306 360 L296 360 M306 432 L296 432 M306 504 L296 504 M306 576 L296 576`,
  consumer:`M860 468 L902 468
M902 385 L902 551 M902 385 L910 385 M902 468 L910 468 M902 551 L910 551
M1018 468 L1036 468 M1122 468 L1134 468
M1134 360 L1134 576 M1134 360 L1144 360 M1134 432 L1144 432 M1134 504 L1144 504 M1134 576 L1144 576`,
  partner:`M720 543 L720 573
M720 573 L595 573 L595 577
M720 573 L720 577
M720 573 L845 573 L845 577
M720 641 L720 659
M720 721 L720 727
M543 727 L897 727
M543 727 L543 735 M661 727 L661 735 M779 727 L779 735 M897 727 L897 735`
};

function svgEl(name,attrs={},text=null){
  const el=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs)) if(v!==null&&v!==undefined) el.setAttribute(k,String(v));
  if(text!==null) el.textContent=String(text);
  return el;
}
function add(parent,name,attrs={},text=null){
  const el=svgEl(name,attrs,text); parent.appendChild(el); return el;
}
function safe(obj,key,fallback=""){ return obj && obj[key]!==undefined && obj[key]!==null ? obj[key] : fallback; }

function normalizeCase(raw){
  if(!raw || typeof raw!=="object") throw new Error("PBMC data must be a JSON object.");
  if(!raw.pbmc) throw new Error("Missing pbmc object.");
  if(!raw.pbmc.core_value_unit) throw new Error("Missing pbmc.core_value_unit.");
  for(const role of ["owner","provider","consumer"]){
    if(!raw.pbmc[role]) throw new Error(`Missing pbmc.${role}.`);
    if(!raw.pbmc[role].actor) throw new Error(`Missing pbmc.${role}.actor.`);
  }
  return raw;
}
function renderState(data){ return safe(data.rendering,"state","after"); }
function roleEnabled(data,role,state){
  const r=data.pbmc[role];
  if(!r) return false;
  if(r.enabled===false) return false;
  if(state==="before" && r.enabled_before!==undefined) return !!r.enabled_before;
  if(state==="after" && r.enabled_after!==undefined) return !!r.enabled_after;
  return true;
}
function getFlows(data,state){
  const f=data.pbmc.flows;
  if(Array.isArray(f)) return f;
  if(!f) return [];
  if(Array.isArray(f[state])) return f[state];
  if(Array.isArray(f.current)) return f.current;
  if(Array.isArray(f.after)) return f.after;
  return [];
}
function valueLines(value,maxChars=15){
  const v=String(value??"").trim();
  if(!v) return ["—"];
  if(v.includes(" / ")){
    const p=v.split(" / ").map(x=>x.trim()).filter(Boolean);
    if(p.length<=3) return p.slice(0,3);
  }
  if(v.length<=maxChars) return [v];
  const words=v.split(/\s+/);
  if(words.length===1) return [v.length>20?v.slice(0,19)+"…":v];
  const lines=[]; let line="";
  for(const w of words){
    const trial=line?line+" "+w:w;
    if(trial.length<=maxChars || !line) line=trial;
    else { lines.push(line); line=w; if(lines.length===2) break; }
  }
  if(line && lines.length<2) lines.push(line);
  if(lines.join(" ").length<v.length && lines.length) lines[lines.length-1]=lines[lines.length-1].replace(/…?$/,"…");
  return lines.slice(0,2);
}
function textWithLines(parent,klass,cx,cy,lines,fontSize=null){
  const attrs={class:klass,x:cx,y:cy,"text-anchor":"middle"};
  if(fontSize) attrs["style"]=`font-size:${fontSize}px`;
  const t=add(parent,"text",attrs);
  const step=17;
  const start=cy-(lines.length-1)*step/2;
  lines.forEach((line,i)=>add(t,"tspan",{x:cx,y:start+i*step},line));
  return t;
}
function pillWidth(label){ return Math.max(48,Math.min(150,String(label).length*6.2+20)); }

function defs(svg){
  const d=add(svg,"defs");
  ROLES.forEach(role=>{
    const m=add(d,"marker",{id:`arrow-${role}`,markerWidth:7,markerHeight:7,refX:6,refY:3.5,orient:"auto",markerUnits:"strokeWidth"});
    add(m,"path",{d:"M0,0 L7,3.5 L0,7 Z",fill:ROLE_COLORS[role]});
  });
}

function drawStructure(svg,data,state){
  const g=add(svg,"g",{class:"structure-lines"});
  ROLES.forEach(role=>{
    if(!roleEnabled(data,role,state)) return;
    add(g,"path",{class:`struct ${role}-line`,d:STRUCTURE[role]});
  });
}

function drawActor(svg,data,role,state,tooltip){
  if(!roleEnabled(data,role,state)) return;
  const rd=data.pbmc[role];
  const actor=rd.actor||{};
  const pos=GEOM.actors[role];
  const g=add(svg,"g",{class:"actor","data-actor":role});
  add(g,"text",{class:"role-label",x:pos.x,y:pos.roleY,"text-anchor":"middle"},ROLE_NAMES[role]);
  const name=String(actor.value||"—");
  const size=Math.max(13,20-Math.max(0,name.length-14)*0.35);
  add(g,"text",{class:"actor-value",x:pos.x,y:pos.valueY,"text-anchor":"middle",style:`font-size:${size}px`},name);
  bindTooltip(g,()=>actorTooltip(role,actor),tooltip);
}

function drawField(svg,data,role,key,tooltip){
  if(!roleEnabled(data,role,renderState(data))) return;
  const box=GEOM.fields[role][key];
  if(!box) return;
  const [x,y,w,h]=box;
  const record=(data.pbmc[role]||{})[key]||{};
  const g=add(svg,"g",{class:role,"data-role":role,"data-key":key});
  add(g,"rect",{class:"box",x,y,width:w,height:h,rx:14,ry:14});
  add(g,"text",{class:"label",x:x+10,y:y+9},(FIELD_LABELS[key]||key).toUpperCase());
  const lines=valueLines(record.value,w>200?24:14);
  const font=lines.some(l=>l.length>16)?11.5:12.5;
  textWithLines(g,"value",x+w/2,y+h/2+9,lines,font);
  bindTooltip(g,()=>fieldTooltip(role,key,record),tooltip);
}

function drawCVU(svg,data,tooltip){
  const c=data.pbmc.core_value_unit||{};
  const {x,y,w,h}=GEOM.cvu;
  const g=add(svg,"g",{class:"cvu","data-role":"core_value_unit","data-key":"core_value_unit"});
  add(g,"rect",{class:"cvu-box",x,y,width:w,height:h,rx:18,ry:18});
  add(g,"text",{class:"label",x:x+13,y:y+11},"CORE VALUE UNIT");
  const lines=valueLines(c.value,26);
  textWithLines(g,"value",x+w/2,y+h/2+4,lines,Math.max(18,24-(lines.join("").length>22?3:0)));
  bindTooltip(g,()=>cvuTooltip(c),tooltip);
}

function drawFlows(svg,data,state){
  const rawFlows=getFlows(data,state);
  const lineLayer=add(svg,"g",{class:"flow-lines"});
  const labelLayer=add(svg,"g",{class:"flow-labels"});

  // One visual route per directed role pair. If a dataset contains several
  // transaction values for the same direction, merge their labels rather than
  // drawing identical arrows on top of each other.
  const grouped=new Map();
  rawFlows.forEach(flow=>{
    const from=String(flow.from||"").toLowerCase();
    const to=String(flow.to||"").toLowerCase();
    if(!ROLES.includes(from)||!ROLES.includes(to)||from===to) return;
    if(!roleEnabled(data,from,state)||!roleEnabled(data,to,state)) return;
    const key=`${from}>${to}`;
    if(!ROUTES[key]){ console.warn("No PBMC route for",key); return; }
    if(!grouped.has(key)) grouped.set(key,{from,to,values:[]});
    const value=String(flow.value||flow.label||"").trim();
    if(value && !grouped.get(key).values.includes(value)) grouped.get(key).values.push(value);
  });

  grouped.forEach(group=>{
    const key=`${group.from}>${group.to}`;
    const route=ROUTES[key];

    add(lineLayer,"path",{
      class:`flow ${group.from}-flow`,
      d:route.d,
      "marker-end":`url(#arrow-${group.from})`
    });

    let value=group.values.length ? group.values.join(" · ") : "Transaction";
    if(value.length>26) value=value.slice(0,25)+"…";
    const [lx,ly]=route.label;
    const width=pillWidth(value);
    const lg=add(labelLayer,"g",{class:`arrow-label ${group.from}-label`,transform:`translate(${lx} ${ly})`});
    add(lg,"rect",{class:"flow-pill",x:-width/2,y:-11,width,height:22,rx:11});
    add(lg,"text",{class:"flow-text",x:0,y:4,"text-anchor":"middle"},value);
  });
}

function fieldTooltip(role,key,record){
  return {
    role:ROLE_NAMES[role],
    field:FIELD_LABELS[key]||key,
    question:QUESTIONS[key]||"",
    value:record.value||"—",
    desc:record.explanation||""
  };
}
function metricText(metrics){
  if(!Array.isArray(metrics)||!metrics.length) return {value:"",desc:""};
  return {
    value:metrics.map(m=>m.value).filter(Boolean).join("\n"),
    desc:metrics.map(m=>m.note).filter(Boolean).join("\n")
  };
}
function actorTooltip(role,actor){
  const m=metricText(actor.metrics);
  return {
    role:ROLE_NAMES[role],
    field:actor.value||"—",
    question:"Case value",
    value:m.value||"",
    desc:m.desc||actor.explanation||""
  };
}
function cvuTooltip(cvu){
  const m=metricText(cvu.metrics);
  return {
    role:"CORE VALUE UNIT",
    field:cvu.value||"—",
    question:QUESTIONS.core_value_unit,
    value:m.value||cvu.value||"",
    desc:m.desc||cvu.explanation||""
  };
}

function bindTooltip(el,getData,tt){
  el.addEventListener("mouseenter",e=>showTooltip(e,getData(),tt));
  el.addEventListener("mousemove",e=>moveTooltip(e,tt));
  el.addEventListener("mouseleave",()=>tt.classList.remove("show"));
}
function showTooltip(e,d,tt){
  tt.querySelector(".role").textContent=d.role||"";
  tt.querySelector(".field").textContent=d.field||"";
  tt.querySelector(".question").textContent=d.question||"";
  tt.querySelector(".val").textContent=d.value||"";
  tt.querySelector(".desc").textContent=d.desc||"";
  moveTooltip(e,tt); tt.classList.add("show");
}
function moveTooltip(e,tt){
  const pad=16,w=360,h=210;
  let x=e.clientX+18,y=e.clientY+18;
  if(x+w>innerWidth-pad)x=e.clientX-w-18;
  if(y+h>innerHeight-pad)y=e.clientY-h-18;
  tt.style.left=Math.max(pad,x)+"px";tt.style.top=Math.max(pad,y)+"px";
}

function render(data){
  const state=renderState(data);
  const svg=document.getElementById("pbmcSvg");
  const tt=document.getElementById("tooltip");
  svg.replaceChildren();
  defs(svg);
  add(svg,"rect",{class:"outer",x:GEOM.outer.x,y:GEOM.outer.y,width:GEOM.outer.w,height:GEOM.outer.h,rx:32,ry:32});
  const brand=add(svg,"text",{class:"canvas-brand",x:1405,y:31,"text-anchor":"end"});
  add(brand,"tspan",{class:"canvas-brand-prefix"},"CREATED BY ");
  add(brand,"tspan",{class:"canvas-brand-name"},"PLATFORM GENERATION");

  // Background structural layer, then flows, then fields/actors.
  drawStructure(svg,data,state);
  drawFlows(svg,data,state);

  ROLES.forEach(role=>drawActor(svg,data,role,state,tt));
  const order={
    owner:["governance","promotion_channel","activities","resources","transaction","gain","job","pain"],
    provider:["filter","access_channel","activities","resources","transaction","gain","job","pain"],
    consumer:["gain","job","pain","transaction","filter","access_channel","activities","resources"],
    partner:["gain","job","pain","transaction","resources","activities","access_channel","filter"]
  };
  ROLES.forEach(role=>{
    if(!roleEnabled(data,role,state)) return;
    order[role].forEach(key=>drawField(svg,data,role,key,tt));
  });
  drawCVU(svg,data,tt);

  const company=safe(data.metadata,"company","PBMC");
  const _caseTitle=document.getElementById("caseTitle"); if(_caseTitle) _caseTitle.textContent=company;
  const _caseSub=document.getElementById("caseSub"); if(_caseSub) _caseSub.textContent=safe(data.metadata,"headline","Data-driven Platform Business Model Canvas.");
  svg.setAttribute("aria-label",`${company} Platform Business Model Canvas`);
}

try{
  const DATA=normalizeCase(JSON.parse(document.getElementById("pbmc-data").textContent));
  render(DATA);
}catch(err){
  console.error(err);
  const box=document.getElementById("dataError");
  box.style.display="block";
  box.textContent="PBMC data error: "+err.message;
}
