#!/usr/bin/env bash
# One-shot class codemod for the Ink & Orange redesign. Safe, mechanical rows only —
# everything judgement-based (radii, game accents, gradients, emoji) is done by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
FILES=$(find app components -type f \( -name '*.tsx' -o -name '*.ts' \))

run() { perl -pi -e "$1" $FILES; }

# 1. neutral greys
run 's/\bslate-/zinc-/g'
# 2–5. old surface tokens
run 's/\bbg-raise\b/bg-ink-800/g'
run 's/\bring-raise\b/ring-ink-800/g'
run 's/\bborder-edge\b/border-line/g'
run 's#\bbg-base/(80|90)\b#bg-ink-950/$1#g'
# 6–12. white-alpha hairlines and fills
run 's#border-white/(\[0\.0[468]\]|10)\b#border-line#g'
run 's#border-white/(\[0\.14\]|15|20)\b#border-line-strong#g'
run 's#divide-white/\[0\.0[46]\]#divide-line#g'
run 's#ring-white/10\b#ring-line#g'
run 's#ring-white/25\b#ring-line-strong#g'
run 's#bg-white/\[0\.02\]#bg-ink-900#g'
run 's#bg-white/\[0\.0[34]\]#bg-ink-700#g'
run 's#bg-white/(\[0\.0[68]\]|\[0\.1\]|10)\b#bg-ink-600#g'
# 13–16. emerald → win
run 's#\b(text|hover:text|group-hover:text)-emerald-(200|300|400)(?![/\d])#$1-win#g'
run 's#text-emerald-300/80#text-win/80#g'
run 's#bg-emerald-(400|500)/(10|15)\b#bg-win/10#g'
run 's#bg-emerald-(400|500)/(20|25)\b#bg-win/20#g'
run 's#bg-emerald-(400|500)/70\b#bg-win/70#g'
run 's#bg-emerald-(400|500)/\[0\.04\]#bg-win/5#g'
run 's#border-emerald-(400|500)/(20|25)\b#border-win/20#g'
# 17–21. red → loss
run 's#\b(text|hover:text|group-hover:text)-red-(100|200|300|400)(?![/\d])#$1-loss#g'
run 's#bg-red-(400|500)/(10|15)\b#bg-loss/10#g'
run 's#bg-red-(400|500)/(20|25)\b#bg-loss/20#g'
run 's#bg-red-(400|500)/70\b#bg-loss/70#g'
run 's#bg-red-(400|500)/\[0\.04\]#bg-loss/5#g'
run 's#border-red-(400|500)/(20|25|30)\b#border-loss/20#g'
run 's#border-red-400/60\b#border-loss/60#g'
run 's#\bbg-red-400\b(?!/)#bg-loss#g'
run 's#\bring-red-400\b#ring-loss#g'
run 's#focus:border-red-400/60#focus:border-loss/60#g'
run 's#focus:ring-red-400/20#focus:ring-loss/30#g'
# 22–23. amber → warn
run 's#\btext-amber-(200|300)\b(?!/)#text-warn#g'
run 's#bg-amber-(400|500)/(10|15)\b#bg-warn/10#g'
run 's#border-amber-(400|500)/(20|25|40)\b#border-warn/20#g'
run 's#\bbg-amber-400\b(?!/)#bg-warn#g'
# 24–29. orange normalisation (hover rule first so the generic tint rule doesn't eat it)
run 's#hover:bg-orange-400/(10|20)\b#hover:bg-orange-500/15#g'
run 's#\btext-orange-(200|300)\b(?![/\d])#text-orange-400#g'
run 's#bg-orange-400/(10|\[0\.06\]|\[0\.08\])#bg-orange-500/10#g'
run 's#border-orange-400/(20|25|30|40)\b#border-orange-500/40#g'
run 's#border-orange-400/50\b#border-orange-500#g'
run 's#\bborder-orange-400\b(?!/)#border-orange-500#g'
run 's#\bbg-orange-400\b(?!/)#bg-orange-500#g'
run 's#ring-orange-(400/40|400/50|700/50)\b#ring-orange-500/40#g'
run 's#focus:border-orange-400/60#focus:border-orange-500/60#g'
run 's#focus:ring-orange-400/20#focus:ring-orange-500/30#g'
# 30. shadows (layout-neutral to drop)
run 's# ?\bshadow-(sm|md|lg|xl)\b##g'
run 's# ?\bshadow-[a-z]+-\d+/\d+\b##g'
run 's# ?\bshadow-black/\d+\b##g'
# 31–33. eyebrow recipes (after the zinc rename)
run 's#text-sm font-semibold uppercase tracking-wider text-zinc-500#eyebrow#g'
run 's#text-xs (font-semibold )?uppercase tracking-wider text-zinc-(500|600)#eyebrow#g'
run 's#text-\[1[01]px\] uppercase tracking-wider text-zinc-(500|600)#eyebrow#g'
# 34. checkbox accents
run 's#accent-(violet|orange)-400\b#accent-orange-500#g'

echo "codemod applied to $(echo "$FILES" | wc -l | tr -d ' ') files"
