const FIELD_PATHS = [
  "pbmc.core_value_unit.value",
  "pbmc.owner.actor.value","pbmc.owner.job.value","pbmc.owner.gain.value","pbmc.owner.pain.value","pbmc.owner.transaction.value","pbmc.owner.governance.value","pbmc.owner.promotion_channel.value","pbmc.owner.activities.value","pbmc.owner.resources.value",
  "pbmc.provider.actor.value","pbmc.provider.job.value","pbmc.provider.gain.value","pbmc.provider.pain.value","pbmc.provider.transaction.value","pbmc.provider.filter.value","pbmc.provider.access_channel.value","pbmc.provider.activities.value","pbmc.provider.resources.value",
  "pbmc.consumer.actor.value","pbmc.consumer.job.value","pbmc.consumer.gain.value","pbmc.consumer.pain.value","pbmc.consumer.transaction.value","pbmc.consumer.filter.value","pbmc.consumer.access_channel.value","pbmc.consumer.activities.value","pbmc.consumer.resources.value",
  "pbmc.partner.actor.value","pbmc.partner.job.value","pbmc.partner.gain.value","pbmc.partner.pain.value","pbmc.partner.transaction.value","pbmc.partner.filter.value","pbmc.partner.access_channel.value","pbmc.partner.activities.value","pbmc.partner.resources.value"
];
const ROLES=["owner","provider","consumer","partner"];
const CONF=["high","medium","low"];
const BASE_INSTRUCTIONS=`You are the Platform Generation PBMC Assistant. You are a specialist co-editor for the Platform Business Model Canvas (PBMC). Apply the methodology below rather than a generic Business Model Canvas.

PBMC METHOD
- Model the platform through four distinct perspectives: Owner, Provider, Consumer and Partner, plus the Core Value Unit (CVU) and a small set of core transaction arrows.
- Owner: the actor that orchestrates the platform, sets governance, controls essential platform resources and enables the market/ecosystem.
- Provider: the supply-side participant that contributes the offering, capacity, content, service or other value that consumers seek.
- Consumer: the demand-side participant that consumes, accesses, buys, watches, uses or benefits from the provider-side value.
- Partner: choose the strategically most important complementary actor for the platform business model to function and thrive. Do not select generic cloud, payments or infrastructure merely because it is visible or measurable. The role must be derived neutrally from the concrete platform mechanism.
- Core Value Unit: the fundamental unit around which matching/exchange happens. Prefer one or two concise concepts, not a sentence.
- Job: what the actor needs to get done. Gain: the positive outcome that matters. Pain: what gets in the way. Keep these conceptually distinct.
- Filter: how participation/value is selected, qualified, ranked or made eligible. Access: how the actor reaches/uses the platform. Activities: essential actor actions. Resources: essential contributions/assets.
- Owner Governance: participation rules, incentives, enforcement or orchestration mechanisms. Owner Promotion: how participation/demand is attracted or activated.
- Transactions: show only the few core exchanges without which the platform model does not work, plus an extra arrow only when it represents a genuine differentiating mechanism. Avoid generic data/status/logistics arrows unless they are central to the model.

STYLE
- Write compact canvas labels, not prose. Prefer 1–2 concepts separated by " / " where useful.
- Actor labels should be role names, not sentences.
- Keep ordinary fields close to 28 characters, transaction labels close to 30, actors close to 24. Shorter is better when meaning remains clear.
- Do not fill space for its own sake. If evidence is weak, lower confidence and explain the uncertainty briefly.
- Distinguish facts supplied by the user from your model-based inference. Never present an uncertain inference as documented fact.
- Explanations may be short prose, but the field value itself must remain compact.

ACTION RULES
- draft: create a coherent first PBMC proposal across the model. Include only fields that add real analytical value.
- complete: focus on blank, weak or inconsistent fields. Do not rewrite strong user entries merely to sound different.
- review: diagnose PBMC logic, role separation, CVU quality, partner selection, Job/Gain/Pain overlap, field concision and transaction quality. Praise only genuinely strong aspects; prioritize useful corrections. For transaction arrows, return concrete add / replace / remove actions only when they materially improve the model. Use the current transaction array index as target_index for replace/remove and -1 for add. Do not suggest decorative or generic arrows.
- suggest: return 2–3 distinct compact alternatives for the requested field, grounded in the current PBMC and context.`;

function allowedOrigin(origin, env){
  const defaults=["https://platformgeneration.com","https://www.platformgeneration.com","http://localhost:8000","http://127.0.0.1:8000"];
  const extra=String(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  return [...new Set([...defaults,...extra])].includes(origin);
}
function cors(origin){return {"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-PBMC-Client","Access-Control-Max-Age":"86400"};}
function json(data,status,origin){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(origin)}});}
function suggestionSchema(){return {type:"object",additionalProperties:false,properties:{summary:{type:"string"},suggestions:{type:"array",items:{type:"object",additionalProperties:false,properties:{path:{type:"string",enum:FIELD_PATHS},value:{type:"string"},explanation:{type:"string"},confidence:{type:"string",enum:CONF}},required:["path","value","explanation","confidence"]}},flows:{type:"array",items:{type:"object",additionalProperties:false,properties:{from:{type:"string",enum:ROLES},to:{type:"string",enum:ROLES},value:{type:"string"},reason:{type:"string"},confidence:{type:"string",enum:CONF}},required:["from","to","value","reason","confidence"]}}},required:["summary","suggestions","flows"]};}
function reviewSchema(){return {type:"object",additionalProperties:false,properties:{summary:{type:"string"},checks:{type:"array",items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},message:{type:"string"},severity:{type:"string",enum:["strong","consider","issue"]},path:{type:"string",enum:["",...FIELD_PATHS]},suggested_value:{type:"string"}},required:["title","message","severity","path","suggested_value"]}},transaction_changes:{type:"array",items:{type:"object",additionalProperties:false,properties:{action:{type:"string",enum:["add","replace","remove"]},target_index:{type:"integer",minimum:-1},title:{type:"string"},severity:{type:"string",enum:["consider","issue"]},from:{type:"string",enum:ROLES},to:{type:"string",enum:ROLES},value:{type:"string"},reason:{type:"string"},confidence:{type:"string",enum:CONF}},required:["action","target_index","title","severity","from","to","value","reason","confidence"]}}},required:["summary","checks","transaction_changes"]};}
function suggestSchema(){return {type:"object",additionalProperties:false,properties:{summary:{type:"string"},suggestions:{type:"array",minItems:2,maxItems:3,items:{type:"object",additionalProperties:false,properties:{value:{type:"string"},reason:{type:"string"}},required:["value","reason"]}}},required:["summary","suggestions"]};}
function schemaFor(action){return action==="review"?reviewSchema():action==="suggest"?suggestSchema():suggestionSchema();}
function extractOutputText(data){if(typeof data.output_text==="string"&&data.output_text)return data.output_text;for(const item of data.output||[]){for(const c of item.content||[]){if(c.type==="output_text"&&typeof c.text==="string")return c.text;}}return "";}
function compactState(state){
  if(!state||typeof state!=="object")return {};
  return {metadata:state.metadata||{},pbmc:state.pbmc||{}};
}
export default {
  async fetch(request, env){
    const origin=request.headers.get("Origin")||"";
    if(!allowedOrigin(origin,env))return new Response("Origin not allowed",{status:403});
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
    if(request.method!=="POST")return json({ok:false,error:"POST only"},405,origin);
    if(!env.OPENAI_API_KEY)return json({ok:false,error:"OPENAI_API_KEY is not configured on the Worker."},500,origin);
    const len=Number(request.headers.get("content-length")||0);if(len>100000)return json({ok:false,error:"Request is too large."},413,origin);
    let body;try{body=await request.json();}catch{return json({ok:false,error:"Invalid JSON request."},400,origin);}
    const action=String(body.action||"");if(!["draft","complete","review","suggest"].includes(action))return json({ok:false,error:"Unknown assistant action."},400,origin);
    const clientId=String(body.client_id||request.headers.get("X-PBMC-Client")||"anonymous").slice(0,120);
    if(env.AI_RATE_LIMITER){const r=await env.AI_RATE_LIMITER.limit({key:clientId||"anonymous"});if(!r.success)return json({ok:false,error:"Too many AI requests. Please wait a minute and try again."},429,origin);}
    const model=action==="suggest"?(env.PBMC_MODEL_FAST||"gpt-5.6-luna"):(env.PBMC_MODEL_SMART||"gpt-5.6-terra");
    const context=body.context&&typeof body.context==="object"?body.context:{};
    const payload={action,context:{platform:String(context.platform||"").slice(0,200),question:String(context.question||"").slice(0,1000),notes:String(context.notes||"").slice(0,8000)},field:body.field||null,current_pbmc:compactState(body.state)};
    const oa={model,store:false,instructions:BASE_INSTRUCTIONS,input:JSON.stringify(payload),reasoning:{effort:action==="suggest"?"none":"low"},max_output_tokens:action==="suggest"?1200:5000,text:{format:{type:"json_schema",name:`pbmc_${action}`,strict:true,schema:schemaFor(action)}},safety_identifier:`pbmc_${clientId.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80)}`};
    let upstream;try{upstream=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(oa)});}catch{return json({ok:false,error:"Could not reach the AI service."},502,origin);}
    const data=await upstream.json().catch(()=>({}));if(!upstream.ok){const msg=data?.error?.message||"OpenAI request failed.";return json({ok:false,error:msg},upstream.status>=500?502:upstream.status,origin);}
    const text=extractOutputText(data);if(!text)return json({ok:false,error:"The AI service returned no usable result."},502,origin);
    let result;try{result=JSON.parse(text);}catch{return json({ok:false,error:"The AI response could not be parsed."},502,origin);}
    return json({ok:true,action,model,result,usage:data.usage||null},200,origin);
  }
};
