// Independent causal checks: no production candidate or hint helper imports.
export const effectKey = e => `${e.kind}:${e.cell}:${e.digit}`;
export const fingerprint = b => b.map(v => v ?? 0).join('');
export const sourceId = s =>
  JSON.stringify([
    s.boardFingerprint,
    s.techniqueCode,
    s.eliminations,
    s.placements,
  ]);
const peers = (a, b) =>
  a !== b &&
  (Math.floor(a / 9) === Math.floor(b / 9) ||
    a % 9 === b % 9 ||
    (Math.floor(a / 27) === Math.floor(b / 27) &&
      Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3)));
function legal(b) {
  return b.map((v, c) =>
    v
      ? 0
      : [1, 2, 3, 4, 5, 6, 7, 8, 9]
          .filter(d => !b.some((n, p) => n === d && peers(c, p)))
          .reduce((m, d) => m | (1 << (d - 1)), 0),
  );
}
function singles(m) {
  const units = [
    c => Math.floor(c / 9),
    c => c % 9,
    c => Math.floor(c / 27) * 3 + Math.floor((c % 9) / 3),
  ];
  return m.flatMap((mask, c) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
      .filter(d => mask & (1 << (d - 1)))
      .filter(
        d =>
          mask === 1 << (d - 1) ||
          units.some(u =>
            m.every(
              (v, p) => p === c || u(p) !== u(c) || !(v & (1 << (d - 1))),
            ),
          ),
      )
      .map(digit => ({ kind: 'placement', cell: c, digit })),
  );
}
function apply(b, m, effects) {
  b = [...b];
  m = [...m];
  for (const e of effects) if (e.kind === 'placement') b[e.cell] = e.digit;
  const l = legal(b);
  m = m.map((v, c) => v & l[c]);
  for (const e of effects)
    if (e.kind === 'elimination') m[e.cell] &= ~(1 << (e.digit - 1));
  return { b, m };
}
export function moveEffects(move) {
  const effects = move.after.values.flatMap((v, c) =>
    v && !move.before.values[c]
      ? [{ kind: 'placement', cell: c, digit: v }]
      : [],
  );
  if (move.appliedHint)
    effects.push(
      ...move.appliedHint.eliminations.map(e => ({
        ...e,
        kind: 'elimination',
      })),
    );
  if (
    move.kind === 'edit_quick_candidate' ||
    move.kind === 'edit_manual_candidate'
  ) {
    const field =
        move.kind === 'edit_quick_candidate'
          ? 'quickCandidates'
          : 'manualCandidates',
      bit = 1 << (move.digit - 1);
    if (
      move.before.candidates[field][move.cell] & bit &&
      !(move.after.candidates[field][move.cell] & bit)
    )
      effects.push({ kind: 'elimination', cell: move.cell, digit: move.digit });
  }
  return effects;
}
// Returns only dependencies justified by an actual accepted hint and a
// continuous forward prefix. Corrections stop proof, not silently skip moves.
export function expectedHintEffects(exposures, history, solution) {
  const expected = new Set();
  for (const exposure of exposures ?? []) {
    const root = history.find(
      m => m.appliedHint && sourceId(m.appliedHint) === sourceId(exposure.step),
    );
    if (!root || !exposure.candidates) continue;
    let cursor = {
      b: [...exposure.step.boardFingerprint].map(Number),
      m: exposure.candidates,
    };
    const effects = [
      ...exposure.step.placements.map(e => ({ ...e, kind: 'placement' })),
      ...exposure.step.eliminations.map(e => ({ ...e, kind: 'elimination' })),
    ];
    const before = new Set(singles(cursor.m).map(effectKey));
    const direct = apply(cursor.b, cursor.m, effects);
    const assisted = new Set(
      [
        ...effects,
        ...singles(direct.m).filter(e => !before.has(effectKey(e))),
      ].map(effectKey),
    );
    let valid = true;
    for (const move of history.filter(m => m.sequence >= root.sequence)) {
      const es = moveEffects(move);
      if (
        fingerprint(cursor.b) !== fingerprint(move.before.values) ||
        move.after.incorrectCells.length ||
        move.before.values.some((v, c) => v && move.after.values[c] !== v) ||
        es.some(
          e =>
            e.kind === 'placement' &&
            !(cursor.m[e.cell] & (1 << (e.digit - 1))),
        ) ||
        (move.kind.startsWith('edit_') && !es.length)
      ) {
        valid = false;
        break;
      }
      // Unknown/wrong pencil facts cannot prove a Sudoku deduction.
      if (
        solution &&
        es.some(
          e => e.kind === 'elimination' && Number(solution[e.cell]) === e.digit,
        )
      ) {
        valid = false;
        break;
      }
      const via = es.filter(e => assisted.has(effectKey(e))),
        existing = new Set(singles(cursor.m).map(effectKey));
      if (via.length)
        for (const e of singles(apply(cursor.b, cursor.m, via).m))
          if (!existing.has(effectKey(e))) assisted.add(effectKey(e));
      cursor = apply(cursor.b, cursor.m, es);
    }
    if (valid) for (const e of assisted) expected.add(e);
  }
  return expected;
}

// Validate staged transitions independently of the production projection.
// Native validates technique proofs; this oracle validates geometry/provenance.
export function auditReasoningStages(report, solution) {
  const failures = [];
  for (const p of report.processes) {
    const root = p.source;
    const error = (kind, sampleId = null) =>
      failures.push({ kind, processId: p.processId, sampleId });
    const b = [...root.beforeBoardFingerprint].map(Number),
      m = root.beforeCandidates;
    const after = apply(b, m, root.effects);
    if (
      fingerprint(after.b) !== root.afterBoardFingerprint ||
      JSON.stringify(after.m) !== JSON.stringify(root.afterCandidates)
    )
      error('source_transition');
    const partition = [...root.observedEffects, ...root.unobservedEffects]
      .map(effectKey)
      .sort();
    if (
      JSON.stringify(partition) !==
      JSON.stringify(root.effects.map(effectKey).sort())
    )
      error('source_observation_partition');
    if (
      solution &&
      root.effects.some(e =>
        e.kind === 'placement'
          ? Number(solution[e.cell]) !== e.digit
          : Number(solution[e.cell]) === e.digit,
      )
    )
      error('unsound_source');
    for (const f of p.finishes) {
      const state = apply(b, m, f.prerequisiteEffects),
        target = f.stage.effects[0];
      if (f.stage.effects.length !== 1 || target.kind !== 'placement') {
        error('finish_shape', f.sampleId);
        continue;
      }
      if (
        f.prerequisiteEffects.some(
          e => !root.effects.some(o => effectKey(o) === effectKey(e)),
        )
      )
        error('foreign_prerequisite', f.sampleId);
      if (
        f.dependency === 'observed' &&
        (f.independentUse !== false ||
          f.prerequisiteEffects.some(
            e => !root.observedEffects.some(o => effectKey(o) === effectKey(e)),
          ))
      )
        error('fabricated_observation', f.sampleId);
      if (f.dependency === 'possible' && f.independentUse !== null)
        error('hypothetical_credit', f.sampleId);
      if (
        singles(m).some(e => effectKey(e) === effectKey(target)) ||
        !singles(state.m).some(e => effectKey(e) === effectKey(target))
      )
        error('not_new_single', f.sampleId);
      if (
        fingerprint(state.b) !== f.stage.beforeBoardFingerprint ||
        JSON.stringify(state.m) !== JSON.stringify(f.stage.beforeCandidates)
      )
        error('finish_anchor', f.sampleId);
      const placed = apply(state.b, state.m, [target]);
      if (
        fingerprint(placed.b) !== f.stage.afterBoardFingerprint ||
        JSON.stringify(placed.m) !== JSON.stringify(f.stage.afterCandidates)
      )
        error('finish_transition', f.sampleId);
    }
  }
  return failures;
}
