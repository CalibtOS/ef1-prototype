#!/usr/bin/env python3
"""
Regenerate the HTML deck's speaker notes from the canonical Markdown.

Single source of truth: berat_proposal_deck.md is canonical. Each slide's
**What you say** block becomes one entry in the HTML's
<script type="application/json" id="speaker-notes"> array (index-mapped to the
<section> document order). Edit the notes in the MD, then run:

    python3 gen-notes.py

Never hand-edit the HTML JSON — that is how the two copies drifted before.
"""
import re, json, sys, pathlib

HERE = pathlib.Path(__file__).parent
MD   = HERE / "berat_proposal_deck.md"
HTML = HERE / "eFactory Proposal.html"

def extract_note(block: str) -> str:
    """Pull the spoken script out of one slide block: everything from the first
    **What you say** header up to **Notes:** (or the slide end), de-quoted."""
    out, collecting = [], False
    for raw in block.splitlines():
        s = raw.strip()
        if re.match(r'^\*\*What you say', s):
            collecting = True
            continue
        if not collecting:
            continue
        if re.match(r'^\*\*Notes:', s) or re.match(r'^---\s*$', s):
            break
        # drop bold-only sub-headers like **Demo script — narrate ...:**
        if re.match(r'^\*\*.*\*\*:?\s*$', s):
            continue
        if s.startswith('>'):
            line = re.sub(r'^>\s?', '', raw).rstrip().replace('*', '')  # strip bold+italic markers
            if line.strip():
                out.append(line.strip())
    return re.sub(r'\s+', ' ', ' '.join(out)).strip()

def main():
    md = MD.read_text(encoding='utf-8')
    # split on slide headings; keep the order
    heads  = re.findall(r'(?m)^## Slide (\d+)\b', md)
    blocks = re.split(r'(?m)^## Slide \d+\b.*$', md)[1:]  # drop preamble
    if len(heads) != len(blocks):
        sys.exit(f"parse error: {len(heads)} headings vs {len(blocks)} blocks")
    notes = [extract_note(b) for b in blocks]
    for i, n in enumerate(notes, 1):
        if not n:
            sys.exit(f"Slide {i}: empty 'What you say' — aborting")

    html = HTML.read_text(encoding='utf-8')
    n_sections = len(re.findall(r'<section\b', html))
    if n_sections != len(notes):
        sys.exit(f"mismatch: {n_sections} HTML sections vs {len(notes)} MD slides")

    arr = '[\n' + ',\n'.join('  ' + json.dumps(n, ensure_ascii=False) for n in notes) + '\n]'
    new_html, k = re.subn(
        r'(<script type="application/json" id="speaker-notes">)(.*?)(</script>)',
        lambda m: m.group(1) + '\n' + arr + '\n' + m.group(3),
        html, flags=re.S)
    if k != 1:
        sys.exit("could not locate #speaker-notes script tag")
    HTML.write_text(new_html, encoding='utf-8')
    print(f"OK — wrote {len(notes)} notes for {n_sections} slides")

if __name__ == '__main__':
    main()
