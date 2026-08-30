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
<header><div class="wrap header-inner"><a class="brand" href="../"><span class="brand-mark"></span><span>PLATFORM<br>GENERATION</span></a><nav><a href="https://www.platformgeneration.com/">Home</a><a href="https://www.platformgeneration.com/#canvas">Canvas</a><a class="active" href="../">PBMC Library</a><a href="https://www.platformgeneration.com/#research">Research</a><a href="https://www.platformgeneration.com/#about">About</a></nav><div class="header-actions"><a class="contact" href="https://www.platformgeneration.com/#contact">Contact</a></div></div></header>
<main>
<section class="hero"><div class="wrap"><a class="back" href="../">← Back to PBMC Library</a><div class="eyebrow">PBMC Case {e(md["case_number"])}</div><h1>{e(md["company"])}</h1><p class="dek">{e(md["headline"])}</p><div class="meta">{meta_pills(case)}</div></div></section>

<section class="section" id="pbmc"><div class="wide-wrap"><div class="section-head canvas-head"><div><div class="eyebrow">PBMC Snapshot · August 2026</div><h2>Platform Business Model Canvas</h2><p class="section-copy">A visual snapshot of the platform architecture. Hover over a field for its PBMC guiding question and case-specific explanation; hover over an actor or the Core Value Unit for case values.</p></div><a class="next-platform-top" href="../{e(nxt["slug"])}/">See next platform →</a></div><div class="canvas-stage"><div class="svg-frame"><svg id="pbmcSvg" viewBox="0 0 1440 960" aria-label="{e(md["company"])} Platform Business Model Canvas"></svg></div><div class="canvas-legend"><span><i style="background:var(--owner)"></i>Owner</span><span><i style="background:var(--provider)"></i>Provider</span><span><i style="background:var(--consumer)"></i>Consumer</span><span><i style="background:var(--partner)"></i>Partner</span></div></div></div></section>

{video_section}

<section class="lesson"><div class="wrap lesson-grid"><div class="lesson-kicker">Platform Lesson</div><div><h2>{e(lesson["title"])}</h2><p>{e(lesson["text"])}</p></div></div></section>

<section class="section soft" id="data"><div class="wrap"><div class="section-head"><div><div class="eyebrow">PBMC Data</div><h2>Structured data behind the canvas</h2><p class="section-copy">One fixed table for every PBMC. Transaction remains one field; all transaction arrows and their explanations stay inside that field, so cases remain directly comparable.</p></div><div class="data-actions"><button class="data-btn" id="copyTable" type="button">Copy table</button><a class="data-btn" href="pbmc-data.csv" download>Download CSV</a><a class="data-btn" href="case.json" download>JSON</a></div></div>{unified_table(case)}</div></section>

<section class="section" id="sources"><div class="wrap"><div class="eyebrow">Evidence</div><div class="section-head"><div><h2>Sources</h2><p class="section-copy">Sources document the platform mechanics and factual case context. The PBMC mapping and Platform Lesson are Platform Generation's analysis.</p></div></div><ol class="sources">{sources_html(case)}</ol></div></section>
<section class="section soft" id="reuse"><div class="wrap"><div class="reuse-box"><div><div class="eyebrow">Open PBMC</div><h3>Use it. Adapt it. Cite it.</h3><p>This PBMC is released under <strong>{e(reuse["license"])}</strong>. You may reuse and adapt it for research, teaching, workshops and consulting with attribution. Adapted versions should not be presented as an Official PBMC of Platform Generation.</p><p class="citation">{e(reuse["citation"])}</p></div><button class="copy-btn" id="copyCitation" type="button">Copy citation</button></div></div></section>

<section class="case-nav"><div class="wrap case-nav-grid"><a class="case-nav-link" href="../{e(prev["slug"])}/"><span class="case-nav-label">← See previous platform</span><span class="case-nav-company">{e(prev["company"])}</span></a><a class="case-nav-link" href="../{e(nxt["slug"])}/"><span class="case-nav-label">See next platform →</span><span class="case-nav-company">{e(nxt["company"])}</span></a></div></section>
</main><footer><div class="wrap footer-inner"><span>© 2026 Platform Generation</span><div class="footer-links"><span>Platform Business Model Canvas</span><span>CC BY 4.0</span></div></div></footer>
<div id="tooltip" class="tooltip"><div class="role"></div><div class="field"></div><div class="question"></div><div class="val"></div><div class="desc"></div></div><div id="dataError" hidden></div>
<script id="pbmc-data" type="application/json">{embedded}</script><script id="pbmc-table-data" type="application/json">{rows_json}</script>
<script>{renderer}</script><script>
const tableRows=JSON.parse(document.getElementById("pbmc-table-data").textContent);
document.getElementById("copyTable").addEventListener("click",async function(){{const cols=["Perspective","Field","Value","Explanation","Transaction Flows"];const tsv=[cols.join("\t"),...tableRows.map(r=>cols.map(c=>String(r[c]??"").replace(/\t/g," ").replace(/\n/g," ")).join("\t"))].join("\n");try{{await navigator.clipboard.writeText(tsv);this.textContent="Copied";setTimeout(()=>this.textContent="Copy table",1500)}}catch(e){{this.textContent="Use CSV"}}}});
document.getElementById("copyCitation").addEventListener("click",async function(){{const citation={json.dumps(reuse["citation"])};try{{await navigator.clipboard.writeText(citation);this.textContent="Copied";setTimeout(()=>this.textContent="Copy citation",1500)}}catch(e){{this.textContent="Select citation above"}}}});
</script></body></html>"""


def home_page(library, css):
    cards=[]
    for c in library["cases"]:
        if c.get("status")!="published":
            continue
        tags=(c.get("industry",[])+c.get("topics",[]))[:4]
        hay=" ".join([
            c.get("company",""),
            c.get("headline",""),
            " ".join(c.get("industry",[])),
            " ".join(c.get("topics",[]))
        ]).lower()
        cards.append(
            '<a class="case-card" href="' + e(c["slug"]) + '/" data-search="' + e(hay) + '">'
            '<div class="case-top"><span>Case ' + e(c["case_number"]) + '</span><span class="badge">Official PBMC</span></div>'
            '<h2>' + e(c["company"]) + '</h2><p>' + e(c["headline"]) + '</p>'
            '<div class="tags">' + ''.join('<span class="tag">'+e(t)+'</span>' for t in tags) + '</div></a>'
        )

    before_cards = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PBMC Library | Platform Generation</title><meta name="description" content="A reusable library of Platform Business Model Canvas cases."><style>"""
    after_css = """</style></head><body><header><div class="wrap header-inner"><a class="brand" href="./"><span class="brand-mark"></span><span>PLATFORM<br>GENERATION</span></a><nav><a href="https://www.platformgeneration.com/">Home</a><a href="https://www.platformgeneration.com/#canvas">Canvas</a><a class="active" href="./">PBMC Library</a><a href="https://www.platformgeneration.com/#research">Research</a><a href="https://www.platformgeneration.com/#about">About</a></nav><div class="header-actions"><a class="contact" href="https://www.platformgeneration.com/#contact">Contact</a></div></div></header><main><section class="library-hero"><div class="wrap"><div class="eyebrow">PBMC Library</div><h1>See how platforms really work.</h1><p>Explore Platform Business Model Canvas snapshots as visual models and structured, reusable data. Watch Platform Generation case studies for the story behind each case.</p></div></section><section class="library-search-wrap"><div class="wrap"><div class="library-search"><input id="librarySearch" type="search" placeholder="Search companies, industries or topics…" autocomplete="off" aria-label="Search PBMC Library"><span class="library-search-icon">⌕</span></div><div class="library-search-meta" id="librarySearchMeta"></div></div></section><section><div class="wrap case-grid" id="caseGrid">"""
    after_cards = """</div><div class="no-results" id="noResults">No PBMCs match your search.</div></section></main><footer><div class="wrap footer-inner"><span>© 2026 Platform Generation</span><div class="footer-links"><span>PBMC Library</span><span>CC BY 4.0</span></div></div></footer><script>(function(){const input=document.getElementById("librarySearch");const cards=[...document.querySelectorAll(".case-card")];const meta=document.getElementById("librarySearchMeta");const empty=document.getElementById("noResults");function update(){const q=input.value.trim().toLowerCase();let visible=0;cards.forEach(card=>{const hit=!q||(card.dataset.search||card.textContent.toLowerCase()).includes(q);card.style.display=hit?"":"none";if(hit)visible++;});meta.textContent=q?(visible+" matching PBMC"+(visible===1?"":"s")):(cards.length+" PBMC"+(cards.length===1?"":"s")+" in the library");empty.style.display=visible===0?"block":"none";}input.addEventListener("input",update);update();})();</script></body></html>"""
    return before_cards + css + after_css + "".join(cards) + after_cards


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
