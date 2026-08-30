from pathlib import Path
import json, html, csv
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"

ROLES = ["owner","consumer","provider","partner"]
ROLE_NAMES = {"owner":"Owner","consumer":"Consumer","provider":"Provider","partner":"Partner"}
ROLE_CSS = {"owner":"var(--owner)","provider":"var(--provider)","consumer":"var(--consumer)","partner":"var(--partner)"}
ROLE_FLOW_CSS = {"owner":"flow-owner","provider":"flow-provider","consumer":"flow-consumer","partner":"flow-partner"}

FIELD_ORDER = {
    "owner":["actor","job","gain","pain","transaction","governance","promotion_channel","activities","resources"],
    "consumer":["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"],
    "provider":["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"],
    "partner":["actor","job","gain","pain","transaction","filter","access_channel","activities","resources"],
}
FIELD_NAMES = {
    "actor":"Actor","job":"Job","gain":"Gain","pain":"Pain","transaction":"Transaction",
    "governance":"Governance","promotion_channel":"Promotion Channel","filter":"Filter",
    "access_channel":"Access Channel","activities":"Activities","resources":"Resources"
}

def e(v):
    return html.escape(str(v or ""), quote=True)

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def active_flows(case):
    state = case.get("rendering", {}).get("state", "after")
    f = case["pbmc"].get("flows", {})
    if isinstance(f, list):
        return f
    return f.get(state) or f.get("current") or f.get("after") or []

def is_role_enabled(case, role):
    r = case["pbmc"].get(role)
    if not r or r.get("enabled") is False:
        return False
    state = case.get("rendering", {}).get("state", "after")
    key = f"enabled_{state}"
    return bool(r.get(key, True))

def data_rows(case):
    """One fixed row per PBMC field. Transaction flows stay inside Transaction."""
    rows = []
    cvu = case["pbmc"].get("core_value_unit", {})
    rows.append({
        "Perspective":"Core Value Unit",
        "Field":"Core Value Unit",
        "Value":cvu.get("value",""),
        "Explanation":cvu.get("explanation",""),
        "Transaction Flows":""
    })
    flows = active_flows(case)
    for role in ROLES:
        rd = case["pbmc"].get(role, {})
        role_enabled = is_role_enabled(case, role)
        for key in FIELD_ORDER[role]:
            rec = rd.get(key, {}) if role_enabled else {}
            tx_flows = []
            if key == "transaction" and role_enabled:
                for flow in flows:
                    if flow.get("from") == role:
                        other, arrow = flow.get("to",""), "→"
                    elif flow.get("to") == role:
                        other, arrow = flow.get("from",""), "←"
                    else:
                        continue
                    item = f"{arrow} {ROLE_NAMES.get(other, other.title())} · {flow.get('value','')}"
                    if flow.get("explanation"):
                        item += f" — {flow.get('explanation')}"
                    tx_flows.append(item)
            rows.append({
                "Perspective": ROLE_NAMES[role],
                "Field": FIELD_NAMES[key],
                "Value": rec.get("value","") if role_enabled else "—",
                "Explanation": rec.get("explanation","") if role_enabled else "Not present in this PBMC snapshot.",
                "Transaction Flows": " | ".join(tx_flows)
            })
    return rows


def write_csv(case_dir, case):
    rows = data_rows(case)
    fields = ["Perspective","Field","Value","Explanation","Transaction Flows"]
    with (case_dir/"pbmc-data.csv").open("w",newline="",encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def transaction_html(case, role):
    items = []
    for flow in active_flows(case):
        if flow.get("from") == role:
            other, arrow = flow.get("to",""), "→"
        elif flow.get("to") == role:
            other, arrow = flow.get("from",""), "←"
        else:
            continue
        label = f"{arrow} {ROLE_NAMES.get(other, other.title())} · {flow.get('value','')}"
        items.append(
            f'<div class="transaction-flow">'
            f'<span class="transaction-flow-main">{e(label)}</span>'
            f'<span class="transaction-flow-note">{e(flow.get("explanation",""))}</span>'
            f'</div>'
        )
    if not items:
        return '<div class="transaction-empty">No direct transaction flow recorded in this snapshot.</div>'
    return '<div class="transaction-stack">' + "".join(items) + '</div>'

def unified_table(case):
    trs = []
    cvu = case["pbmc"].get("core_value_unit", {})
    trs.append(
        f'<tr class="cvu-row">'
        f'<td class="perspective-cell">Core Value Unit</td>'
        f'<td class="field-cell">Core Value Unit</td>'
        f'<td class="value-cell">{e(cvu.get("value","—"))}</td>'
        f'<td class="explanation-cell">{e(cvu.get("explanation",""))}</td>'
        f'</tr>'
    )
    for role in ROLES:
        rd = case["pbmc"].get(role, {})
        role_enabled = is_role_enabled(case, role)
        for i, key in enumerate(FIELD_ORDER[role]):
            rec = rd.get(key, {}) if role_enabled else {}
            value = rec.get("value","—") if role_enabled else "—"
            explanation = rec.get("explanation","") if role_enabled else "Not present in this PBMC snapshot."
            tx = transaction_html(case, role) if key == "transaction" and role_enabled else ""
            start = " role-start" if i == 0 else ""
            trs.append(
                f'<tr class="role-{role}{start}">'
                f'<td class="perspective-cell">{e(ROLE_NAMES[role])}</td>'
                f'<td class="field-cell">{e(FIELD_NAMES[key])}</td>'
                f'<td class="value-cell">{e(value)}{tx}</td>'
                f'<td class="explanation-cell">{e(explanation)}</td>'
                f'</tr>'
            )
    return (
        '<div class="pbmc-data-table-wrap"><table class="pbmc-data-table">'
        '<colgroup><col class="perspective"><col class="field"><col class="value"><col></colgroup>'
        '<thead><tr><th>Perspective</th><th>Field</th><th>Value</th><th>Explanation</th></tr></thead>'
        '<tbody>' + "".join(trs) + '</tbody></table></div>'
    )


def sources_html(case):
    out=[]
    for i,s in enumerate(case.get("sources",[]),1):
        meta=" · ".join(x for x in [s.get("publisher",""),s.get("date","")] if x)
        out.append(f"""<li><span class="source-no">{i:02d}</span><div><a href="{e(s.get("url"))}" target="_blank" rel="noopener noreferrer">{e(s.get("title"))} ↗</a><div class="source-meta">{e(meta)}</div><p>{e(s.get("note"))}</p></div></li>""")
    return "".join(out)

def meta_pills(case):
    md=case["metadata"]
    parts=['<span class="meta-pill official">Official PBMC</span>']
    for x in md.get("industry",[]): parts.append(f'<span class="meta-pill">{e(x)}</span>')
    for x in md.get("topics",[]): parts.append(f'<span class="meta-pill">{e(x)}</span>')
    parts.append('<span class="meta-pill">Snapshot · August 2026</span>')
    return "".join(parts)

def nav_for(library, slug):
    pub=[c for c in library["cases"] if c.get("status")=="published"]
    i=next(i for i,c in enumerate(pub) if c["slug"]==slug)
    return pub[(i-1)%len(pub)], pub[(i+1)%len(pub)], len(pub)==1


def youtube_video_id(url):
    """Extract a YouTube video ID from common watch, youtu.be, shorts, live or embed URLs."""
    if not url:
        return ""
    try:
        u=urlparse(url.strip())
        host=u.netloc.lower().split(":")[0]
        if host in {"youtu.be","www.youtu.be"}:
            return u.path.strip("/").split("/")[0]
        if host.endswith("youtube.com"):
            if u.path == "/watch":
                return parse_qs(u.query).get("v",[""])[0]
            parts=[p for p in u.path.split("/") if p]
            if len(parts)>=2 and parts[0] in {"shorts","embed","live"}:
                return parts[1]
    except Exception:
        return ""
    return ""

def case_page(case, library, css, renderer):
    md=case["metadata"]; lesson=case["platform_lesson"]; reuse=case["reuse"]
    prev,nxt,only_one=nav_for(library,md["slug"])
    search_cases=[{
        "slug":c.get("slug",""),
        "company":c.get("company",""),
        "headline":c.get("headline",""),
        "industry":c.get("industry",[]),
        "topics":c.get("topics",[])
    } for c in library["cases"] if c.get("status")=="published"]
    search_json=json.dumps(search_cases,ensure_ascii=False).replace("</","<\\/").replace("<","\\u003c")
    embedded=json.dumps(case,ensure_ascii=False).replace("</","<\\/").replace("<","\\u003c")
    rows_json=json.dumps(data_rows(case),ensure_ascii=False).replace("</","<\\/").replace("<","\\u003c")
    media=case.get("media",{})
    video_url=media.get("youtube_url","").strip()
    video_title=media.get("youtube_title","").strip() or "Watch the story behind the snapshot"
    video_section=""
    if video_url:
        video_id=youtube_video_id(video_url)
        if video_id:
            thumb=f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            fallback=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            video_section=f"""<section class="section video-section" id="video"><div class="wrap">
<div class="video-showcase">
<a class="video-thumb-link" href="{e(video_url)}" target="_blank" rel="noopener noreferrer" aria-label="Watch {e(video_title)} on YouTube">
<img class="video-thumb" src="{e(thumb)}" alt="{e(video_title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='{e(fallback)}';">
<span class="video-thumb-overlay"><span class="video-play" aria-hidden="true"></span></span>
</a>
<div class="video-info">
<div class="eyebrow">Platform Generation · Case Study</div>
<h3>{e(video_title)}</h3>
<a class="video-watch-link" href="{e(video_url)}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>
</div>
</div></div></section>"""
        else:
            video_section=f"""<section class="section video-section" id="video"><div class="wrap"><div class="video-card"><div><div class="eyebrow">Platform Generation · Case Study</div><h3>{e(video_title)}</h3></div><a class="video-cta live" href="{e(video_url)}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></div></div></section>"""
    json_ld={
        "@context":"https://schema.org","@type":"CreativeWork",
        "name":f"{md['company']} — Platform Business Model Canvas","headline":md["headline"],
        "datePublished":md["published_date"],"dateModified":md["updated_date"],
        "creator":{"@type":"Person","name":"Davis Eisape"},
        "publisher":{"@type":"Organization","name":"Platform Generation"},
        "license":"https://creativecommons.org/licenses/by/4.0/",
        "about":md.get("industry",[])+md.get("topics",[]),"citation":reuse["citation"],
    }
    return f"""<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(md["company"])} PBMC | Platform Generation</title>
<meta name="description" content="{e(md["headline"])} Explore the Platform Business Model Canvas, structured PBMC data, transaction flows and sources.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://pbmc.platformgeneration.com/{e(md["slug"])}/">
<script type="application/ld+json">{json.dumps(json_ld,ensure_ascii=False)}</script><style>{css}</style></head><body>
<header><div class="wrap header-inner"><a class="brand" href="../"><img class="brand-logo" src="../assets/platform-generation-logo-black.png" alt="Platform Generation"></a><nav><a href="https://www.platformgeneration.com/">Home</a><a href="https://www.platformgeneration.com/#canvas">Canvas</a><a class="active" href="../">PBMC Library</a><a href="https://www.platformgeneration.com/#research">Research</a><a href="https://www.platformgeneration.com/#about">About</a></nav><div class="header-actions"><a class="contact" href="https://www.platformgeneration.com/#contact">Contact</a></div></div></header>
<main>
<section class="case-header"><div class="wrap">
<div class="case-utility-row"><div class="pbmc-toolbar">
<div class="case-search" id="caseSearch">
<input class="case-search-input" id="caseSearchInput" type="search" placeholder="Search PBMCs…" autocomplete="off" aria-label="Search PBMC Library">
<span class="case-search-icon">⌕</span>
<div class="case-search-results" id="caseSearchResults" role="listbox"></div>
</div>
<a class="next-platform-top" href="../{e(nxt["slug"])}/">See next platform →</a>
</div></div>
<div class="case-snapshot-line">PBMC Case {e(md["case_number"])} · Snapshot made in August 2026</div>
<h1>{e(md["company"])}</h1>
<p class="case-question">{e(md["headline"])}</p>
<div class="meta">{meta_pills(case)}</div>
</div></section>

<section class="section" id="pbmc"><div class="wide-wrap">
<div class="canvas-stage"><div class="svg-frame"><svg id="pbmcSvg" viewBox="0 0 1440 960" aria-label="{e(md["company"])} Platform Business Model Canvas"></svg></div><div class="canvas-legend"><span><i style="background:var(--owner)"></i>Owner</span><span><i style="background:var(--provider)"></i>Provider</span><span><i style="background:var(--consumer)"></i>Consumer</span><span><i style="background:var(--partner)"></i>Partner</span></div></div>
<p class="canvas-note">A visual snapshot of the Platform Business Model Canvas (PBMC). Hover over a field for its PBMC guiding question and case-specific explanation; hover over an actor or the Core Value Unit for case values.</p>
</div></section>

{video_section}

<section class="lesson"><div class="wrap lesson-grid"><div class="lesson-kicker">Platform Lesson</div><div><h2>{e(lesson["title"])}</h2><p>{e(lesson["text"])}</p></div></div></section>

<section class="section soft" id="data"><div class="wrap"><div class="section-head"><div><div class="eyebrow">PBMC Data</div><h2>Structured data behind the canvas</h2><p class="section-copy">One fixed table for every PBMC. Transaction remains one field; all transaction arrows and their explanations stay inside that field, so cases remain directly comparable.</p></div><div class="data-actions"><button class="data-btn" id="copyTable" type="button">Copy table</button><a class="data-btn" href="pbmc-data.csv" download>Download CSV</a><a class="data-btn" href="case.json" download>JSON</a></div></div>{unified_table(case)}</div></section>

<section class="section" id="sources"><div class="wrap"><div class="eyebrow">Evidence</div><div class="section-head"><div><h2>Sources</h2><p class="section-copy">Sources document the platform mechanics and factual case context. The PBMC mapping and Platform Lesson are Platform Generation's analysis.</p></div></div><ol class="sources">{sources_html(case)}</ol></div></section>
<section class="section soft" id="reuse"><div class="wrap"><div class="reuse-box"><div><div class="eyebrow">Open PBMC</div><h3>Use it. Adapt it. Cite it.</h3><p>This PBMC is released under <strong>{e(reuse["license"])}</strong>. You may reuse and adapt it for research, teaching, workshops and consulting with attribution. Adapted versions should not be presented as an Official PBMC of Platform Generation.</p><p class="citation">{e(reuse["citation"])}</p></div><button class="copy-btn" id="copyCitation" type="button">Copy citation</button></div></div></section>

<section class="case-nav"><div class="wrap case-nav-grid"><a class="case-nav-link" href="../{e(prev["slug"])}/"><span class="case-nav-label">← See previous platform</span><span class="case-nav-company">{e(prev["company"])}</span></a><a class="case-nav-link" href="../{e(nxt["slug"])}/"><span class="case-nav-label">See next platform →</span><span class="case-nav-company">{e(nxt["company"])}</span></a></div></section>
</main><footer style="background:#111;color:#fff"><div class="wrap footer-inner"><img class="footer-logo" src="../assets/platform-generation-logo-white.png" alt="Platform Generation"><div class="footer-links"><span>Platform Business Model Canvas</span><span>CC BY 4.0</span></div></div></footer>
<div id="tooltip" class="tooltip"><div class="role"></div><div class="field"></div><div class="question"></div><div class="val"></div><div class="desc"></div></div><div id="dataError" hidden></div>
<script id="pbmc-data" type="application/json">{embedded}</script><script id="pbmc-table-data" type="application/json">{rows_json}</script>
<script>{renderer}</script><script>
const tableRows=JSON.parse(document.getElementById("pbmc-table-data").textContent);
document.getElementById("copyTable").addEventListener("click",async function(){{const cols=["Perspective","Field","Value","Explanation","Transaction Flows"];const tsv=[cols.join("\t"),...tableRows.map(r=>cols.map(c=>String(r[c]??"").replace(/\t/g," ").replace(/\n/g," ")).join("\t"))].join("\n");try{{await navigator.clipboard.writeText(tsv);this.textContent="Copied";setTimeout(()=>this.textContent="Copy table",1500)}}catch(e){{this.textContent="Use CSV"}}}});
document.getElementById("copyCitation").addEventListener("click",async function(){{const citation={json.dumps(reuse["citation"])};try{{await navigator.clipboard.writeText(citation);this.textContent="Copied";setTimeout(()=>this.textContent="Copy citation",1500)}}catch(e){{this.textContent="Select citation above"}}}});
</script>
<script id="library-search-data" type="application/json">{search_json}</script>
<script>
(function(){{
  const input=document.getElementById("caseSearchInput");
  const box=document.getElementById("caseSearchResults");
  const shell=document.getElementById("caseSearch");
  if(!input||!box||!shell)return;
  const cases=JSON.parse(document.getElementById("library-search-data").textContent);
  let matches=[];
  let active=-1;

  function escapeHtml(value){{
    const d=document.createElement("div");
    d.textContent=value||"";
    return d.innerHTML;
  }}

  function searchable(c){{
    return [c.company,c.headline].concat(c.industry||[]).concat(c.topics||[]).join(" ").toLowerCase();
  }}

  function draw(){{
    const q=input.value.trim().toLowerCase();
    matches=(q ? cases.filter(function(c){{return searchable(c).includes(q);}}) : cases).slice(0,8);
    active=-1;

    if(!matches.length){{
      box.innerHTML='<div class="case-search-empty">No matching PBMC</div>';
      box.classList.add("show");
      return;
    }}

    box.innerHTML=matches.map(function(c,i){{
      const meta=(c.industry||[]).concat(c.topics||[]).slice(0,4).join(" · ");
      return '<a class="case-search-item" data-i="'+i+'" href="../'+encodeURIComponent(c.slug)+'/">'
        +'<span class="case-search-company">'+escapeHtml(c.company)+'</span>'
        +'<span class="case-search-meta">'+escapeHtml(meta)+'</span></a>';
    }}).join("");

    box.classList.add("show");
  }}

  function setActive(index){{
    const items=[].slice.call(box.querySelectorAll(".case-search-item"));
    items.forEach(function(item){{item.classList.remove("active");}});
    if(!items.length)return;
    active=(index+items.length)%items.length;
    items[active].classList.add("active");
    items[active].scrollIntoView({{block:"nearest"}});
  }}

  input.addEventListener("focus",draw);
  input.addEventListener("input",draw);
  input.addEventListener("keydown",function(e){{
    if(e.key==="ArrowDown"){{e.preventDefault();setActive(active+1);}}
    else if(e.key==="ArrowUp"){{e.preventDefault();setActive(active-1);}}
    else if(e.key==="Enter"&&active>=0&&matches[active]){{e.preventDefault();location.href="../"+matches[active].slug+"/";}}
    else if(e.key==="Escape"){{box.classList.remove("show");input.blur();}}
  }});

  document.addEventListener("click",function(e){{
    if(!shell.contains(e.target))box.classList.remove("show");
  }});
}})();
</script></body></html>"""


def home_page(library, css):
    published=[c for c in library["cases"] if c.get("status")=="published"]
    if not published:
        return "<!doctype html><html><body>No published PBMCs.</body></html>"
    target=published[0]["slug"] + "/"
    return (
        '<!doctype html><html lang="en"><head>'
        '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="refresh" content="0; url=' + e(target) + '">'
        '<title>PBMC Library | Platform Generation</title>'
        '<script>location.replace(' + json.dumps(target) + ');</script>'
        '</head><body><p><a href="' + e(target) + '">Open PBMC Library</a></p></body></html>'
    )


def build():
    library=load_json(ROOT/"library.json")
    css=(ASSETS/"site.css").read_text(encoding="utf-8")
    renderer=(ASSETS/"pbmc-renderer-v18.2.js").read_text(encoding="utf-8")
    pub=[c for c in library["cases"] if c.get("status")=="published"]
    if not pub: raise SystemExit("No published cases.")
    for entry in pub:
        case_dir=ROOT/entry["slug"]
        case=load_json(case_dir/"case.json")
        if case["metadata"]["slug"]!=entry["slug"]:
            raise SystemExit(f"Slug mismatch: {entry['slug']}")
        write_csv(case_dir,case)
        (case_dir/"index.html").write_text(case_page(case,library,css,renderer),encoding="utf-8")
    (ROOT/"index.html").write_text(home_page(library,css),encoding="utf-8")
    print(f"Built {len(pub)} PBMC case(s).")

if __name__=="__main__":
    build()
