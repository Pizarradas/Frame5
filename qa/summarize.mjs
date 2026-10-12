import { readFileSync } from 'node:fs';
for (const d of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(d + '/report.json'));
  console.log('\n######', r.label);
  for (const k of ['desktop', 'laptop', 'mobile', 'reduced', 'dark']) {
    const x = r[k];
    console.log(`${k.padEnd(8)} samples ${x.textSamples} | contrast fails ${x.contrastFails} (uniq ${x.contrastFailsUnique}) | overlap ${x.overlapEvents} | clipped ${x.clippedEvents} | blur ${x.blurredEvents} | errors ${x.errors.length}`);
    for (const f of x.contrastWorst.slice(0, 6)) console.log('    cf', f.y, f.ratio, '<', f.need, JSON.stringify(f.text));
    for (const o of x.overlapPairs.slice(0, 6)) console.log('    ov', o.y, JSON.stringify(o.a), 'x', JSON.stringify(o.b));
    for (const c of x.clipped.slice(0, 4)) console.log('    cl', c.y, JSON.stringify(c.text), c.visible);
  }
  console.log('axe desk', JSON.stringify(r.axeDesktop.map(v => v.id + ':' + v.nodes)), 'mob', JSON.stringify(r.axeMobile.map(v => v.id + ':' + v.nodes)));
  console.log('kb', JSON.stringify(r.keyboard));
  console.log('perf', JSON.stringify(r.perf));
}
