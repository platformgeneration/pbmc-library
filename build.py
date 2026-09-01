from pathlib import Path
import json, html, csv, calendar, re
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


def snapshot_info(case):
    md=case["metadata"]
    raw=md.get("snapshot_date") or md.get("published_date") or md.get("updated_date") or ""
    try:
        year=int(raw[:4])
        month_num=int(raw[5:7])
        day=int(raw[8:10]) if len(raw)>=10 else 1
    except Exception:
        year,month_num,day=2026,8,1
    month_name=calendar.month_name[month_num]
    return {
        "raw":raw,
        "year":year,
        "month_num":month_num,
        "month_name":month_name,
        "display":f"{month_name} {year}"
    }

def meta_pills(case):
    md=case["metadata"]
    parts=['<span class="meta-pill official">Official PBMC</span>']

    # Visible tags are deliberately curated:
    # 1 specific industry/category + up to 2 case-specific topics.
    # Full metadata remains unchanged in case.json/library.json.
    visible=[]

    industries=[x for x in md.get("industry",[]) if x]
    if industries:
        # Convention: the more specific category is stored last.
        visible.append(industries[-1])

    for item in md.get("topics",[]):
        if item and item not in visible:
            visible.append(item)
        if len(visible)>=3:
            break

    # Fallback when a case has very little topic metadata.
    if len(visible)<3:
        for item in reversed(industries[:-1]):
            if item not in visible:
                visible.append(item)
            if len(visible)>=3:
                break

    for item in visible[:3]:
        parts.append(f'<span class="meta-pill">{e(item)}</span>')

    snap=snapshot_info(case)
    parts.append(f'<span class="meta-pill">Snapshot · {e(snap["display"])}</span>')
    return "".join(parts)


def citation_info(case):
    md=case["metadata"]
    reuse=case.get("reuse",{})
    cdata=reuse.get("citation_data",{})
    authors=cdata.get("authors") or [{"family":"Eisape","given":"Davis Adedayo","display":"Eisape, D. A."}]
    publisher=cdata.get("publisher","Platform Generation")
    resource_type=cdata.get("resource_type","PBMC snapshot")
    snap=snapshot_info(case)
    year=snap["year"]
    month_num=snap["month_num"]
    month_name=snap["month_name"]
    month_bib=calendar.month_abbr[month_num].lower()
    canonical=f"https://pbmc.platformgeneration.com/{md['slug']}/"
    title=f"{md['company']} — Platform Business Model Canvas"
    author_display=", ".join(a.get("display") or (a.get("family","")+", "+a.get("given","")) for a in authors)
    recommended=(
        f"{author_display} ({year}). {title} "
        f"[{resource_type}, {month_name} {year}]. {publisher}. {canonical}"
    )
    key_base=re.sub(r"[^a-z0-9]+","",md.get("company","").lower())
    family=re.sub(r"[^a-z0-9]+","",authors[0].get("family","eisape").lower())
    bibkey=f"{family}{year}{key_base}pbmc"
    bib_author=" and ".join(
        f"{a.get('family','')}, {a.get('given','')}".strip(", ")
        for a in authors
    )
    # Classic BibTeX-compatible @misc. URL is duplicated in note for older styles,
    # while modern BibTeX/biblatex can also use the url field.
    bibtex=(
        f"@misc{{{bibkey},\n"
        f"  author       = {{{bib_author}}},\n"
        f"  title        = {{{md['company']} --- Platform Business Model Canvas}},\n"
        f"  howpublished = {{{publisher} PBMC Library}},\n"
        f"  year         = {{{year}}},\n"
        f"  month        = {month_bib},\n"
        f"  url          = {{{canonical}}},\n"
        f"  note         = {{{resource_type}, {month_name} {year}. Case-specific analysis/data: CC BY 4.0. PBMC canvas/template: CC BY-SA 4.0 with attribution. Platform Generation logos and Official PBMC designation are excluded from the Creative Commons licenses. Available at: {canonical}}}\n"
        f"}}"
    )
    return {
        "recommended":recommended,
        "bibtex":bibtex,
        "bibkey":bibkey,
        "canonical":canonical,
        "year":year,
        "month_name":month_name
    }

def write_bib(case_dir, case):
    info=citation_info(case)
    (case_dir/"citation.bib").write_text(info["bibtex"]+"\n",encoding="utf-8")

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

def case_page(case, css, renderer):
    md=case["metadata"]; lesson=case["platform_lesson"]; reuse=case["reuse"]
    cite=citation_info(case)
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
        "about":md.get("industry",[])+md.get("topics",[]),"citation":cite["recommended"],"url":cite["canonical"],
    }
    return f"""<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(md["company"])} PBMC | Platform Generation</title>
<meta name="description" content="{e(md["headline"])} Explore the Platform Business Model Canvas, structured PBMC data, transaction flows and sources.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://pbmc.platformgeneration.com/{e(md["slug"])}/">
<script type="application/ld+json">{json.dumps(json_ld,ensure_ascii=False)}</script><style>{css}</style></head><body>
<header><div class="wrap header-inner">
<a class="brand" href="../"><img class="brand-logo" src="../assets/platform-generation-logo-black.png" alt="Platform Generation"></a>
<nav id="siteNav">
<a href="https://www.platformgeneration.com/">Home</a>
<a href="https://www.platformgeneration.com/#canvas">Canvas</a>
<a class="active" href="../">PBMC Library</a>
<a href="https://www.platformgeneration.com/#research">Research</a>
<a href="https://www.platformgeneration.com/#about">About</a>
</nav>
<div class="header-library-actions" id="headerLibraryActions">
<div class="case-search header-search" id="caseSearch">
<input class="case-search-input" id="caseSearchInput" type="search" placeholder="Search PBMCs…" autocomplete="off" aria-label="Search PBMC Library">
<span class="case-search-icon">⌕</span>
<div class="case-search-results" id="caseSearchResults" role="listbox"></div>
</div>
<a class="header-next-platform" id="nextPlatformTop" href="../" aria-label="See next platform">See next platform →</a>
</div>
<button class="mobile-menu-toggle" id="mobileMenuToggle" type="button" aria-expanded="false" aria-controls="siteNav" aria-label="Open menu"><span></span><span></span><span></span></button>
</div></header>
<main>
<section class="case-header"><div class="wrap">
<div class="case-snapshot-line">PBMC Case {e(md["case_number"])} · Snapshot made in {e(snapshot_info(case)["display"])}</div>
<h1>{e(md["company"])}</h1>
<p class="case-question">{e(md["headline"])}</p>
<div class="meta">{meta_pills(case)}</div>
</div></section>

<section class="section" id="pbmc"><div class="wide-wrap">
<div class="canvas-stage" id="canvasStage">
<button class="canvas-mobile-launch" id="openCanvasViewer" type="button">Explore canvas ↗</button>
<div class="canvas-mobile-controls" id="canvasMobileControls">
  <div class="canvas-mobile-controls-left"><button class="canvas-control-btn canvas-control-close" id="closeCanvasViewer" type="button">Close</button></div>
  <div class="canvas-mobile-controls-right">
    <button class="canvas-control-btn" id="canvasZoomOut" type="button" aria-label="Zoom out">−</button>
    <span class="canvas-zoom-label" id="canvasZoomLabel">100%</span>
    <button class="canvas-control-btn" id="canvasZoomIn" type="button" aria-label="Zoom in">+</button>
    <button class="canvas-control-btn" id="canvasZoomReset" type="button">Reset</button>
  </div>
</div>
<div class="svg-frame" id="canvasViewport"><svg id="pbmcSvg" viewBox="0 0 1440 960" aria-label="{e(md["company"])} Platform Business Model Canvas"></svg></div><div class="canvas-legend"><span><i style="background:var(--owner)"></i>Owner</span><span><i style="background:var(--provider)"></i>Provider</span><span><i style="background:var(--consumer)"></i>Consumer</span><span><i style="background:var(--partner)"></i>Partner</span></div></div>
<p class="canvas-note">A visual snapshot of the Platform Business Model Canvas (PBMC). Hover over or tap a field for its PBMC guiding question and case-specific explanation; hover over or tap an actor or the Core Value Unit for case values.</p>
</div></section>

{video_section}

<section class="lesson"><div class="wrap lesson-grid"><div class="lesson-kicker">Platform Lesson</div><div><h2>{e(lesson["title"])}</h2><p>{e(lesson["text"])}</p></div></div></section>

<section class="section soft" id="data"><div class="wrap"><div class="section-head"><div><div class="eyebrow">PBMC Data</div><h2>Structured data behind the canvas</h2><p class="section-copy">One fixed table for every PBMC. Transaction remains one field; all transaction arrows and their explanations stay inside that field, so cases remain directly comparable.</p></div><div class="data-actions"><button class="data-btn" id="copyTable" type="button">Copy table</button><a class="data-btn" href="pbmc-data.csv" download>Download CSV</a><a class="data-btn" href="case.json" download>JSON</a></div></div>{unified_table(case)}</div></section>

<section class="section" id="sources"><div class="wrap"><div class="eyebrow">Evidence</div><div class="section-head"><div><h2>Sources</h2><p class="section-copy">Sources document the platform mechanics and factual case context. The PBMC mapping and Platform Lesson are Platform Generation's analysis.</p></div></div><ol class="sources">{sources_html(case)}</ol></div></section>
<section class="section soft" id="reuse"><div class="wrap"><div class="reuse-box">
<div class="citation-intro">
<div class="eyebrow">Open PBMC</div>
<h3>Use it. Cite it. Build on it.</h3>
<p>The <strong>case-specific analysis and structured data</strong> are available under <strong>CC BY 4.0</strong>. You may cite, copy, analyze and adapt the case materials with attribution.</p>

<div class="ip-boundary">
<div class="ip-boundary-title">PBMC reuse</div>
<p>The <strong>Platform Business Model Canvas (PBMC) canvas/template</strong> is available under <strong>CC BY-SA 4.0</strong>. You may reproduce, teach with, use commercially and adapt it, provided clear attribution to the original PBMC remains and adapted versions are shared under the same license.</p>
<div class="attribution-box">
<span class="attribution-label">Attribution</span>
<strong>Platform Business Model Canvas (PBMC), Dr. Davis Eisape / Platform Generation — platformgeneration.com</strong>
</div>
<div class="attribution-box adapted">
<span class="attribution-label">For adapted versions</span>
<strong>Adapted from the Platform Business Model Canvas (PBMC), Dr. Davis Eisape / Platform Generation — platformgeneration.com</strong>
</div>
<p>An <strong>unmodified Official PBMC</strong> should retain its displayed provenance rather than having Platform Generation attribution removed or replaced. An adapted version may carry your own branding, but the PBMC attribution must remain clearly visible and the adaptation must not be presented as an <strong>Official PBMC</strong>.</p>
<p class="brand-note">Platform Generation logos and the <strong>Official PBMC</strong> designation are not included in the Creative Commons licenses and may not be used to imply endorsement by Platform Generation.</p>
</div>
</div>

<div class="citation-panel">
<div class="citation-format-label">Recommended citation</div>
<div class="citation-recommended" id="recommendedCitation">{e(cite["recommended"])}</div>
<div class="citation-actions">
<button class="citation-action" id="copyCitation" type="button">Copy citation</button>
<button class="citation-action" id="copyBibtex" type="button">Copy BibTeX</button>
<a class="citation-action secondary" href="citation.bib" download="{e(cite["bibkey"])}.bib">Download .bib</a>
</div>
<details class="bibtex-details">
<summary>BibTeX</summary>
<pre class="bibtex-code" id="bibtexCode">{e(cite["bibtex"])}</pre>
</details>
<div class="citation-meta-note">Case data: CC BY 4.0 · PBMC canvas/template: CC BY-SA 4.0 · Attribution required · Platform Generation PBMC Library</div>
</div>
</div></div></section>

<section class="case-nav"><div class="wrap case-nav-grid">
<a class="case-nav-link" id="prevPlatform" href="../" aria-label="See previous platform"><span class="case-nav-label">← See previous platform</span><span class="case-nav-company" id="prevPlatformName">…</span></a>
<a class="case-nav-link" id="nextPlatform" href="../" aria-label="See next platform"><span class="case-nav-label">See next platform →</span><span class="case-nav-company" id="nextPlatformName">…</span></a>
</div></section>
</main><footer style="background:#111;color:#fff"><div class="wrap footer-inner"><img class="footer-logo" src="../assets/platform-generation-logo-white.png" alt="Platform Generation"><div class="footer-links"><a class="footer-contact" href="https://www.platformgeneration.com/#contact">Contact</a><span>Platform Business Model Canvas</span><span>Case data: CC BY 4.0</span><span>PBMC canvas: CC BY-SA 4.0</span></div></div></footer>
<div id="tooltip" class="tooltip"><div class="role"></div><div class="field"></div><div class="question"></div><div class="val"></div><div class="desc"></div></div><div id="dataError" hidden></div>
<script id="pbmc-data" type="application/json">{embedded}</script><script id="pbmc-table-data" type="application/json">{rows_json}</script>
<script>{renderer}</script><script>
const tableRows=JSON.parse(document.getElementById("pbmc-table-data").textContent);

async function copyTextRobust(text){{
  // Preferred path on GitHub Pages / HTTPS.
  if(navigator.clipboard && window.isSecureContext){{
    try{{
      await navigator.clipboard.writeText(text);
      return true;
    }}catch(e){{
      // Continue to browser fallback below.
    }}
  }}

  // Fallback for browsers that deny Clipboard API access.
  const area=document.createElement("textarea");
  area.value=text;
  area.setAttribute("readonly","");
  area.style.position="fixed";
  area.style.opacity="0";
  area.style.pointerEvents="none";
  area.style.left="-9999px";
  area.style.top="0";
  document.body.appendChild(area);

  area.focus();
  area.select();
  area.setSelectionRange(0,area.value.length);

  let ok=false;
  try{{
    ok=document.execCommand("copy");
  }}catch(e){{
    ok=false;
  }}

  document.body.removeChild(area);
  return ok;
}}

function copiedFeedback(button,originalLabel,ok){{
  button.textContent=ok ? "Kopiert ✓" : "Copy failed";
  setTimeout(function(){{
    button.textContent=originalLabel;
  }},1700);
}}

document.getElementById("copyTable").addEventListener("click",async function(){{
  const tab=String.fromCharCode(9);
  const newline=String.fromCharCode(10);
  const cols=["Perspective","Field","Value","Explanation","Transaction Flows"];

  function cleanCell(value){{
    return String(value == null ? "" : value)
      .split(tab).join(" ")
      .split(newline).join(" ");
  }}

  const lines=[cols.join(tab)];
  tableRows.forEach(function(row){{
    lines.push(cols.map(function(col){{return cleanCell(row[col]);}}).join(tab));
  }});

  const ok=await copyTextRobust(lines.join(newline));
  copiedFeedback(this,"Copy table",ok);
}});

document.getElementById("copyCitation").addEventListener("click",async function(){{
  const citation=document.getElementById("recommendedCitation").textContent.trim();
  const ok=await copyTextRobust(citation);
  copiedFeedback(this,"Copy citation",ok);
}});

document.getElementById("copyBibtex").addEventListener("click",async function(){{
  const bibtex=document.getElementById("bibtexCode").textContent.trim();
  const ok=await copyTextRobust(bibtex);
  copiedFeedback(this,"Copy BibTeX",ok);
}});
</script>
<script>
(function(){{
  const menuBtn=document.getElementById("mobileMenuToggle");
  const nav=document.getElementById("siteNav");
  const libraryActions=document.getElementById("headerLibraryActions");
  const headerInner=document.querySelector(".header-inner");

  function syncHeaderLibraryActions(){{
    if(!nav||!libraryActions||!headerInner||!menuBtn) return;
    const mobile=window.matchMedia("(max-width: 1000px)").matches;
    if(mobile){{
      if(libraryActions.parentNode!==nav) nav.appendChild(libraryActions);
    }}else{{
      if(libraryActions.parentNode!==headerInner) headerInner.insertBefore(libraryActions,menuBtn);
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded","false");
      menuBtn.setAttribute("aria-label","Open menu");
    }}
  }}

  syncHeaderLibraryActions();
  window.addEventListener("resize",syncHeaderLibraryActions);

  if(menuBtn&&nav){{
    menuBtn.addEventListener("click",function(){{
      syncHeaderLibraryActions();
      const open=nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded",open?"true":"false");
      menuBtn.setAttribute("aria-label",open?"Close menu":"Open menu");
    }});
    nav.addEventListener("click",function(e){{
      if(e.target.closest("a") && !e.target.closest(".header-next-platform")){{
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded","false");
      }}
    }});
  }}

  const stage=document.getElementById("canvasStage");
  const openBtn=document.getElementById("openCanvasViewer");
  const closeBtn=document.getElementById("closeCanvasViewer");
  const viewport=document.getElementById("canvasViewport");
  const svg=document.getElementById("pbmcSvg");
  const zoomIn=document.getElementById("canvasZoomIn");
  const zoomOut=document.getElementById("canvasZoomOut");
  const zoomReset=document.getElementById("canvasZoomReset");
  const zoomLabel=document.getElementById("canvasZoomLabel");
  const tooltip=document.getElementById("tooltip");

  if(stage&&openBtn&&closeBtn&&viewport&&svg){{
    let zoom=1;
    const baseWidth=1250;
    const minZoom=.72;
    const maxZoom=1.8;

    function applyZoom(){{
      if(!stage.classList.contains("canvas-mobile-fullscreen")) return;
      svg.style.width=Math.round(baseWidth*zoom)+"px";
      svg.style.minWidth=Math.round(baseWidth*zoom)+"px";
      if(zoomLabel) zoomLabel.textContent=Math.round(zoom*100)+"%";
    }}

    function resetView(){{
      zoom=1;
      applyZoom();
      requestAnimationFrame(function(){{
        viewport.scrollLeft=Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);
        viewport.scrollTop=0;
      }});
    }}

    function openViewer(){{
      stage.classList.add("canvas-mobile-fullscreen");
      document.body.classList.add("canvas-viewer-open");
      resetView();
      closeBtn.focus();
    }}

    function closeViewer(){{
      stage.classList.remove("canvas-mobile-fullscreen");
      document.body.classList.remove("canvas-viewer-open");
      svg.style.width="";
      svg.style.minWidth="";
      if(tooltip) tooltip.classList.remove("show");
      openBtn.focus();
    }}

    openBtn.addEventListener("click",openViewer);
    closeBtn.addEventListener("click",closeViewer);
    if(zoomIn) zoomIn.addEventListener("click",function(){{zoom=Math.min(maxZoom,zoom+.15);applyZoom();}});
    if(zoomOut) zoomOut.addEventListener("click",function(){{zoom=Math.max(minZoom,zoom-.15);applyZoom();}});
    if(zoomReset) zoomReset.addEventListener("click",resetView);

    document.addEventListener("keydown",function(e){{
      if(e.key==="Escape"&&stage.classList.contains("canvas-mobile-fullscreen")) closeViewer();
    }});

    // Simple two-finger pinch zoom while the full-screen canvas is open.
    let pinchStartDistance=0;
    let pinchStartZoom=1;
    function distance(touches){{
      const dx=touches[0].clientX-touches[1].clientX;
      const dy=touches[0].clientY-touches[1].clientY;
      return Math.sqrt(dx*dx+dy*dy);
    }}
    viewport.addEventListener("touchstart",function(e){{
      if(stage.classList.contains("canvas-mobile-fullscreen")&&e.touches.length===2){{
        pinchStartDistance=distance(e.touches);
        pinchStartZoom=zoom;
      }}
    }},{{passive:true}});
    viewport.addEventListener("touchmove",function(e){{
      if(stage.classList.contains("canvas-mobile-fullscreen")&&e.touches.length===2&&pinchStartDistance>0){{
        e.preventDefault();
        zoom=Math.max(minZoom,Math.min(maxZoom,pinchStartZoom*(distance(e.touches)/pinchStartDistance)));
        applyZoom();
      }}
    }},{{passive:false}});
    viewport.addEventListener("touchend",function(e){{
      if(e.touches.length<2) pinchStartDistance=0;
    }},{{passive:true}});

    // Tap outside a PBMC item closes the touch tooltip.
    viewport.addEventListener("click",function(e){{
      if(!e.target.closest("[data-role],[data-actor],.cvu")&&tooltip) tooltip.classList.remove("show");
    }});
  }}
}})();
</script>
<script>
(function(){{
  const CURRENT_SLUG={json.dumps(md["slug"])};
  const input=document.getElementById("caseSearchInput");
  const box=document.getElementById("caseSearchResults");
  const shell=document.getElementById("caseSearch");
  let cases=[];
  let matches=[];
  let active=-1;

  function published(items){{
    return (items||[]).filter(function(c){{return !c.status || c.status==="published";}});
  }}

  function escapeHtml(value){{
    const d=document.createElement("div");
    d.textContent=value||"";
    return d.innerHTML;
  }}

  function searchable(c){{
    return [c.company||"",c.headline||""]
      .concat(c.industry||[])
      .concat(c.topics||[])
      .join(" ")
      .toLowerCase();
  }}

  function applyNavigation(items){{
    const pub=published(items);
    const i=pub.findIndex(function(c){{return c.slug===CURRENT_SLUG;}});
    if(i<0||!pub.length)return;

    const prev=pub[(i-1+pub.length)%pub.length];
    const next=pub[(i+1)%pub.length];

    const prevLink=document.getElementById("prevPlatform");
    const nextLink=document.getElementById("nextPlatform");
    const topNext=document.getElementById("nextPlatformTop");
    const prevName=document.getElementById("prevPlatformName");
    const nextName=document.getElementById("nextPlatformName");

    if(prevLink)prevLink.href="../"+encodeURIComponent(prev.slug)+"/";
    if(nextLink)nextLink.href="../"+encodeURIComponent(next.slug)+"/";
    if(topNext)topNext.href="../"+encodeURIComponent(next.slug)+"/";
    if(prevName)prevName.textContent=prev.company||"Previous platform";
    if(nextName)nextName.textContent=next.company||"Next platform";
  }}

  function draw(){{
    if(!input||!box)return;
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
    if(!box)return;
    const items=[].slice.call(box.querySelectorAll(".case-search-item"));
    items.forEach(function(item){{item.classList.remove("active");}});
    if(!items.length)return;
    active=(index+items.length)%items.length;
    items[active].classList.add("active");
    items[active].scrollIntoView({{block:"nearest"}});
  }}

  function bindSearch(){{
    if(!input||!box||!shell)return;
    input.addEventListener("focus",draw);
    input.addEventListener("input",draw);
    input.addEventListener("keydown",function(e){{
      if(e.key==="ArrowDown"){{e.preventDefault();setActive(active+1);}}
      else if(e.key==="ArrowUp"){{e.preventDefault();setActive(active-1);}}
      else if(e.key==="Enter"&&active>=0&&matches[active]){{
        e.preventDefault();
        location.href="../"+encodeURIComponent(matches[active].slug)+"/";
      }}
      else if(e.key==="Escape"){{box.classList.remove("show");input.blur();}}
    }});

    document.addEventListener("click",function(e){{
      if(!shell.contains(e.target))box.classList.remove("show");
    }});
  }}

  async function loadRuntimeLibrary(){{
    try{{
      const response=await fetch("../library.json",{{cache:"no-store"}});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const payload=await response.json();
      cases=published(Array.isArray(payload)?payload:(payload.cases||[]));
      applyNavigation(cases);
    }}catch(err){{
      console.warn("PBMC Library index could not be loaded.",err);
      cases=[];
    }}
  }}

  bindSearch();
  loadRuntimeLibrary();
}})();
</script></script></body></html>"""


def home_page():
    return """<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PBMC Library | Platform Generation</title>
<meta name="robots" content="index,follow">
</head><body>
<p id="fallback"><a href="scalable-capital/">Open PBMC Library</a></p>
<script>
(async function(){
  try{
    const response=await fetch("library.json",{cache:"no-store"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const payload=await response.json();
    const cases=(Array.isArray(payload)?payload:(payload.cases||[])).filter(function(c){
      return !c.status || c.status==="published";
    });
    if(cases.length)location.replace(cases[0].slug+"/");
  }catch(err){
    console.warn("PBMC Library index could not be loaded.",err);
  }
})();
</script>
</body></html>"""


def build():
    library=load_json(ROOT/"library.json")
    css=(ASSETS/"site.css").read_text(encoding="utf-8")
    renderer=(ASSETS/"pbmc-renderer-v18.8.js").read_text(encoding="utf-8")
    pub=[c for c in library["cases"] if c.get("status")=="published"]
    if not pub: raise SystemExit("No published cases.")
    for entry in pub:
        case_dir=ROOT/entry["slug"]
        case=load_json(case_dir/"case.json")
        if case["metadata"]["slug"]!=entry["slug"]:
            raise SystemExit(f"Slug mismatch: {entry['slug']}")
        write_csv(case_dir,case)
        write_bib(case_dir,case)
        (case_dir/"index.html").write_text(case_page(case,css,renderer),encoding="utf-8")
    (ROOT/"index.html").write_text(home_page(),encoding="utf-8")
    print(f"Built {len(pub)} PBMC case(s).")

if __name__=="__main__":
    build()
