// Read the app's teaching data at build time. Published pages need no JS or SDK.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const publicDir = path.join(root, 'site/public');
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const app = relative => require(path.join(root, 'src', relative));
const { LessonRepository } = app('data/lessons/lesson-repository.ts');
const { buildLessonPresentation } = app('domain/lessons/presentation.ts');
const { HINT_PRESENTATION_COPIES } = app(
  'localization/hint-presentation-copy.ts',
);
const { TECHNIQUES } = app('domain/hints/techniques.ts');
const { ENABLED_LOCALES, LANGUAGE_NAMES } = app('localization/locales.ts');
const { LESSON_COPY } = app('localization/lesson-copy.ts');
const { TECHNIQUE_ARTICLE_COPY, ARTICLE_LABELS, ARTICLE_PATTERN_LABELS } = app(
  'localization/technique-articles.ts',
);
const { BASIC_COURSES, BASIC_LESSON_COPY, basicText } = app(
  'localization/basic-lesson-copy.ts',
);
const { basicScene, basicParams, BASIC_FRAME_COUNTS } = app(
  'data/lessons/basic-lessons.ts',
);
const { TERM_CONCEPTS, TERM_CONCEPT_QUESTIONS } = app(
  'data/lessons/term-concepts.ts',
);
const { conceptArticlePatterns, conceptArticleScene } = app(
  'data/lessons/term-concept-article-patterns.ts',
);
const { conceptArticlePatternLabel } = app(
  'localization/term-concept-patterns.ts',
);
const { conceptDiagramCaption, conceptDiagramStep, conceptSummary } = app(
  'localization/term-concept-diagram-copy.ts',
);
const { TERM_CONCEPT_COPY, TERM_CONCEPT_UI, TERM_EXAMPLE_CONCLUSION } = app(
  'localization/term-concept-copy.ts',
);
const catalog = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src/data/lessons/generated/lesson-catalog.json'),
    'utf8',
  ),
);
const repository = new LessonRepository(catalog);
const copy = JSON.parse(
  fs.readFileSync(new URL('course-copy.json', import.meta.url), 'utf8'),
);
const origin = 'https://readytradie.com';
const store =
  'https://play.google.com/store/apps/details?id=com.platongames.sudoku';
const esc = value =>
  String(value).replace(
    /[&<>"']/g,
    ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        ch
      ]),
  );
const slug = value =>
  value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll('.', '-')
    .toLowerCase();
const localeSlug = locale =>
  locale === 'en' ? '' : `${locale.toLowerCase()}/`;
const product = locale => `/platon-sudoku/${localeSlug(locale)}`;
const course = (locale, topic = '') =>
  `/guides/sudoku/${localeSlug(locale)}${topic ? `${topic}/` : ''}`;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const checking = process.argv.includes('--check');
const differences = [];
const write = (relative, content) => {
  const target = path.join(publicDir, relative);
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
    if (checking) differences.push(relative);
    else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
};
const assets = new Map();
const renderedBoards = new Map();
const boardLegends = new Map();
const pages = [];
const manifest = {
  locales: ENABLED_LOCALES,
  techniques: TECHNIQUES.map(x => x.code),
  lessonIds: catalog.lessons.map(x => x.lesson_id),
  basicCourses: BASIC_COURSES,
  concepts: TERM_CONCEPTS,
  pages: [],
  sources: {},
};
for (const source of [
  'src/data/lessons/generated/lesson-catalog.json',
  'src/data/lessons/generated/basic-lessons.json',
  'src/localization/technique-articles.ts',
  'src/data/lessons/term-concepts.ts',
])
  manifest.sources[source] = hash(fs.readFileSync(path.join(root, source)));

function regionCells(region) {
  return Array.from({ length: 9 }, (_, n) =>
    region.kind === 'row'
      ? region.index * 9 + n
      : region.kind === 'column'
      ? n * 9 + region.index
      : (Math.floor(region.index / 3) * 3 + Math.floor(n / 3)) * 9 +
        (region.index % 3) * 3 +
        (n % 3),
  );
}
const center = cell => [
  30 + (cell % 9) * 60 + 30,
  30 + Math.floor(cell / 9) * 60 + 30,
];
const notePoint = (cell, digit) => [
  30 + (cell % 9) * 60 + ((digit - 1) % 3) * 20 + 10,
  30 + Math.floor(cell / 9) * 60 + Math.floor((digit - 1) / 3) * 20 + 10,
];
const key = item => `${item.cell}:${item.digit}`;

function boardAsset(values, masks, visuals = {}, result = null) {
  const data = { values, masks, visuals, result };
  const signature = hash(JSON.stringify(data)).slice(0, 24);
  if (!renderedBoards.has(signature)) {
    const source = new Set();
    const cover = new Set();
    const conflictRegions = new Set();
    const cellRoles = new Map(
      (visuals.cellMarks ?? []).map(mark => [mark.cell, mark.role]),
    );
    for (const mark of visuals.diagramRegions ?? [])
      for (const cell of regionCells(mark.region)) {
        (mark.role === 'fishCover' || mark.role === 'affected'
          ? cover
          : source
        ).add(cell);
        if (mark.conflict) conflictRegions.add(cell);
      }
    for (const mark of visuals.regionMarks ?? [])
      for (const cell of regionCells(mark.region))
        (mark.role === 'fishCover' || mark.role === 'affected'
          ? cover
          : source
        ).add(cell);
    if (visuals.showFocusRegions)
      for (const region of visuals.focusRegions ?? [])
        for (const cell of regionCells(region)) source.add(cell);
    const focused = new Set([
      ...(visuals.showFocusCells ? visuals.focusCells ?? [] : []),
      ...(visuals.spotlightCells ?? []),
    ]);
    const potential = new Set(
      [
        ...(visuals.showPremises ? visuals.premiseCandidates ?? [] : []),
        ...(visuals.finCandidates ?? []),
      ].map(key),
    );
    const removed = new Set(
      [
        ...(visuals.showEliminations ? visuals.eliminations ?? [] : []),
        ...(visuals.priorEliminations ?? []),
        ...(result?.eliminations ?? []),
      ].map(key),
    );
    const conclusions = new Set(
      [
        ...(visuals.showPlacements ? visuals.placements ?? [] : []),
        ...(result?.placements ?? []),
      ].map(key),
    );
    for (const mark of visuals.candidateMarks ?? [])
      (mark.role === 'excluded'
        ? removed
        : mark.role === 'result'
        ? conclusions
        : potential
      ).add(key(mark));
    const reasoning = new Map(
      (visuals.reasoningCandidates ?? []).map(mark => [key(mark), mark]),
    );
    const colors = new Map(
      (visuals.colorMarks ?? []).map(mark => [key(mark), mark]),
    );
    const fins = new Set((visuals.finCandidates ?? []).map(key));
    const placed = new Map(
      (result?.placements ?? []).map(mark => [mark.cell, mark.digit]),
    );
    const elements = [];
    for (let cell = 0; cell < 81; cell++) {
      const [x, y] = center(cell);
      const fill =
        placed.has(cell) || cellRoles.get(cell) === 'result'
          ? '#d6ede4'
          : cellRoles.get(cell) === 'eliminationTarget' ||
            conflictRegions.has(cell)
          ? '#fbe5e7'
          : focused.has(cell)
          ? '#d5e9f7'
          : cover.has(cell)
          ? '#fff0d6'
          : source.has(cell)
          ? '#e9f3fa'
          : '#fff';
      elements.push(
        `<rect x="${x - 30}" y="${
          y - 30
        }" width="60" height="60" fill="${fill}"/>`,
      );
    }
    for (const link of visuals.links ?? []) {
      if (link.hidden) continue;
      const [x1, y1] = center(link.from),
        [x2, y2] = center(link.to);
      elements.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${
          link.conflict ? '#a32632' : '#497e96'
        }" stroke-width="${link.active ? 4 : 2}" opacity="${
          link.muted ? 0.28 : 0.7
        }"${link.kind === 'peer' ? ' stroke-dasharray="6 4"' : ''}/>`,
      );
    }
    for (let cell = 0; cell < 81; cell++) {
      const [x, y] = center(cell),
        value = placed.get(cell) ?? values[cell];
      if (value)
        elements.push(
          `<text data-cell="${cell}" data-value="${value}" x="${x}" y="${y}" font-size="32" font-weight="600" fill="${
            placed.has(cell) ? '#17695c' : '#183d38'
          }">${value}</text>`,
        );
      else
        for (let digit = 1; digit <= 9; digit++) {
          const candidateKey = `${cell}:${digit}`;
          if (
            !(masks[cell] & (1 << (digit - 1))) &&
            !reasoning.has(candidateKey) &&
            !conclusions.has(candidateKey)
          )
            continue;
          if (
            visuals.diagramDigit &&
            digit !== visuals.diagramDigit &&
            !(visuals.preserveCandidateCells ?? []).includes(cell) &&
            !reasoning.has(candidateKey)
          )
            continue;
          const [nx, ny] = notePoint(cell, digit),
            reason = reasoning.get(candidateKey),
            color = colors.get(candidateKey);
          const strike = removed.has(candidateKey) || reason?.truth === 'false';
          const isResult = conclusions.has(candidateKey) || reason?.conclusion;
          const fill = strike
            ? '#9d2635'
            : isResult
            ? '#17695c'
            : fins.has(candidateKey)
            ? '#007f80'
            : color
            ? ['#195f99', '#8d640e', '#773c96', '#177c5c', '#b14930'][
                color.component % 5
              ]
            : potential.has(candidateKey) || reason
            ? '#195f99'
            : '#55675f';
          if (color) {
            const attributes = `data-color-component="${
              color.component
            }" data-color-state="${
              color.color === 0 ? 'A' : 'B'
            }" fill="${fill}" fill-opacity="0.12" stroke="${fill}" stroke-width="1.5"`;
            elements.push(
              color.color === 0
                ? `<circle cx="${nx}" cy="${ny}" r="9" ${attributes}/>`
                : `<rect x="${nx - 9}" y="${
                    ny - 9
                  }" width="18" height="18" ${attributes}/>`,
            );
          } else if (potential.has(candidateKey) || reason || isResult)
            elements.push(
              `<rect x="${nx - 9}" y="${
                ny - 9
              }" width="18" height="18" rx="4" fill="${
                fins.has(candidateKey)
                  ? '#d4f2ed'
                  : isResult
                  ? '#d6ede4'
                  : '#e2eff8'
              }"${
                reason?.role === 'assumption'
                  ? ' stroke="#195f99" stroke-dasharray="2 2"'
                  : ''
              }/>`,
            );
          elements.push(
            `<text data-cell="${cell}" data-candidate="${digit}" x="${nx}" y="${ny}" font-size="16" font-weight="${
              potential.has(candidateKey) || reason || isResult ? 700 : 400
            }" fill="${fill}"${
              strike ? ' text-decoration="line-through"' : ''
            }>${digit}</text>`,
          );
          if (strike)
            elements.push(
              `<path d="M${nx - 7},${
                ny + 6
              } l14,-12" stroke="#9d2635" stroke-width="1.6"/>`,
            );
        }
    }
    for (const item of visuals.valueEvidenceRings ??
      visuals.valueEvidence ??
      []) {
      const [x, y] = center(item.cell);
      elements.push(
        `<circle cx="${x}" cy="${y}" r="21" fill="none" stroke="#195f99" stroke-width="3"/>`,
      );
    }
    for (const group of visuals.candidateGroups ?? [])
      for (const candidate of group.candidates) {
        const [x, y] = notePoint(candidate.cell, candidate.digit);
        elements.push(
          `<rect x="${x - 9}" y="${
            y - 9
          }" width="18" height="18" rx="3" fill="none" stroke="#875b9d" stroke-width="2"/>`,
        );
      }
    for (const conflict of visuals.reasoningConflicts ?? [])
      for (const cell of conflict.cells) {
        const [x, y] = center(cell);
        elements.push(
          `<rect x="${x - 27}" y="${
            y - 27
          }" width="54" height="54" fill="none" stroke="#a32632" stroke-width="3" stroke-dasharray="5 3"/>`,
        );
      }
    for (let n = 0; n <= 9; n++) {
      const at = 30 + n * 60;
      elements.push(
        `<path d="M30,${at} H570 M${at},30 V570" fill="none" stroke="${
          n % 3 ? '#a5b7ac' : '#345b4e'
        }" stroke-width="${n % 3 ? 1 : 3}"/>`,
      );
      if (n < 9)
        elements.push(
          `<text x="${60 + n * 60}" y="14" font-size="15">${
            n + 1
          }</text><text x="14" y="${60 + n * 60}" font-size="15">${
            n + 1
          }</text>`,
        );
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" font-family="Arial,sans-serif" text-anchor="middle" dominant-baseline="central"><metadata>${esc(
      JSON.stringify(data),
    )}</metadata>${elements.join('')}</svg>\n`;
    const relative = `guides/sudoku/boards/${hash(svg).slice(0, 24)}.svg`;
    assets.set(relative, svg);
    renderedBoards.set(signature, relative);
    const states = new Map();
    for (const mark of visuals.colorMarks ?? []) {
      const state = `${mark.color === 0 ? '●' : '■'} ${mark.component + 1}${
        mark.color === 0 ? 'A' : 'B'
      }`;
      const members = states.get(state) ?? [];
      members.push(
        `R${Math.floor(mark.cell / 9) + 1}C${(mark.cell % 9) + 1}=${
          mark.digit
        }`,
      );
      states.set(state, members);
    }
    const legend = [...states].map(
      ([state, members]) => `${state}: ${members.join(', ')}`,
    );
    for (const group of visuals.candidateGroups ?? [])
      legend.push(
        `G${group.id}: ${group.candidates
          .map(
            item =>
              `R${Math.floor(item.cell / 9) + 1}C${(item.cell % 9) + 1}=${
                item.digit
              }`,
          )
          .join(', ')}`,
      );
    boardLegends.set(relative, legend);
  }
  return `/${renderedBoards.get(signature)}`;
}

function figure(asset, caption, id = '') {
  return `<figure class="course-board"${
    id ? ` data-lesson-id="${esc(id)}"` : ''
  }><a href="${asset}"><img src="${asset}" width="600" height="600" loading="lazy" alt="${esc(
    caption,
  )}"></a><figcaption>${esc(caption)}${(boardLegends.get(asset.slice(1)) ?? [])
    .map(line => `<p class="course-color-key" dir="ltr">${esc(line)}</p>`)
    .join('')}</figcaption></figure>`;
}
const paras = text => `<p>${esc(text)}</p>`;
const links = items =>
  `<ul class="course-links">${items
    .map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`)
    .join('')}</ul>`;
function download(locale) {
  return `<a class="primary-link" href="${store}">${esc(
    copy[locale][7],
  )} <span aria-hidden="true">↗</span></a>`;
}
function shell(locale, topic, title, description, body, ids = []) {
  const url = origin + course(locale, topic),
    ui = LESSON_COPY[locale];
  const alternatives = [
    ...ENABLED_LOCALES.map(
      language =>
        `<link rel="alternate" hreflang="${language}" href="${origin}${course(
          language,
          topic,
        )}">`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${origin}${course(
      'en',
      topic,
    )}">`,
  ].join('\n');
  const menu = `<details class="language-picker"><summary><bdi>${
    LANGUAGE_NAMES[locale]
  }</bdi></summary><nav aria-label="${esc(
    copy[locale][0],
  )}" class="language-options">${ENABLED_LOCALES.map(
    language =>
      `<a href="${course(
        language,
        topic,
      )}" lang="${language}" hreflang="${language}"${
        locale === language ? ' aria-current="page"' : ''
      }><bdi>${LANGUAGE_NAMES[language]}</bdi></a>`,
  ).join('')}</nav></details>`;
  const breadcrumbs = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Platon Sudoku',
      item: origin + product(locale),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: copy[locale][0],
      item: origin + course(locale),
    },
  ];
  if (topic)
    breadcrumbs.push({
      '@type': 'ListItem',
      position: 3,
      name: title,
      item: url,
    });
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': origin + '/#organization',
        name: 'Platon Games',
        url: origin + '/',
      },
      {
        '@type': topic ? 'Article' : 'CollectionPage',
        '@id': url + '#article',
        url,
        ...(topic
          ? {
              headline: title,
              author: { '@id': origin + '/#organization' },
              publisher: { '@id': origin + '/#organization' },
            }
          : { name: title }),
        description,
        inLanguage: locale,
      },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
    ],
  };
  const html = `<!doctype html><html lang="${locale}" dir="${
    locale === 'ar' ? 'rtl' : 'ltr'
  }"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(
    title,
  )} | Platon Sudoku</title><meta name="description" content="${esc(
    description,
  )}"><link rel="canonical" href="${url}">${alternatives}<meta property="og:type" content="${
    topic ? 'article' : 'website'
  }"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(
    title,
  )} | Platon Sudoku"><meta property="og:description" content="${esc(
    description,
  )}"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/guides.css"><link rel="stylesheet" href="/courses.css?v=${hash(
    fs.readFileSync(path.join(publicDir, 'courses.css')),
  ).slice(0, 12)}"><script type="application/ld+json">${JSON.stringify(
    graph,
  ).replaceAll(
    '<',
    '\\u003c',
  )}</script></head><body class="guide-site course-site"><a class="skip-link" href="#main">${esc(
    ui.begin,
  )}</a><header class="site-header"><a class="brand" href="/">Platon Games</a><nav><a href="${product(
    locale,
  )}">Platon Sudoku</a><a href="${course(locale)}">${esc(
    ui.directory,
  )}</a><a href="${store}">Google Play ↗</a></nav></header><main class="guide-main" id="main"><nav class="breadcrumbs" aria-label="${esc(
    ui.directory,
  )}"><ol>${breadcrumbs
    .map(
      (item, index) =>
        `<li>${
          index === breadcrumbs.length - 1
            ? `<span aria-current="page">${esc(item.name)}</span>`
            : `<a href="${item.item}">${esc(item.name)}</a>`
        }</li>`,
    )
    .join(
      '',
    )}</ol></nav>${menu}<article><header class="guide-intro"><p class="eyebrow">Platon Sudoku · ${esc(
    ui.title,
  )}</p><h1>${esc(title)}</h1><p class="lead">${esc(
    description,
  )}</p><p class="course-source">${esc(copy[locale][1])}</p>${download(
    locale,
  )}</header>${body}<section class="guide-next" id="continue"><h2>${esc(
    ui.practice,
  )}</h2><p>${esc(copy[locale][1])}</p>${download(locale)}${links([
    [product(locale), 'Platon Sudoku'],
    [course(locale), ui.directory],
  ])}</section></article></main><footer class="site-footer"><a href="${product(
    locale,
  )}">Platon Sudoku</a><a href="${course(locale)}">${esc(
    ui.directory,
  )}</a><a href="${store}">Google Play ↗</a><span>Platon Games</span></footer></body></html>\n`;
  write(course(locale, topic).slice(1) + 'index.html', html);
  pages.push(url);
  manifest.pages.push({ url, locale, topic, lessonIds: ids });
}

function basicBody(locale, basic) {
  const text = BASIC_LESSON_COPY[locale],
    ui = LESSON_COPY[locale];
  return text.pages[basic]
    .map((page, index) => {
      const frame = basic === 'how-to-play' ? BASIC_FRAME_COUNTS[index] - 1 : 0;
      const scene = basicScene(basic, index, frame);
      const masks = Array(81).fill(0);
      for (const [cell, digits] of Object.entries(scene.notes))
        for (const digit of digits) masks[cell] |= 1 << (digit - 1);
      const body = basicText(page.body, basicParams(basic));
      const visuals = {
        showFocusCells: true,
        focusCells: scene.selected === null ? [] : [scene.selected],
        showFocusRegions: true,
        focusRegions: scene.regions,
        valueEvidenceRings: scene.evidence.map(cell => ({
          cell,
          digit: scene.values[cell],
        })),
        showPremises: false,
        showEliminations: false,
        showPlacements: false,
        candidateMarks: Object.entries(scene.notes).flatMap(([cell, digits]) =>
          digits
            .filter(digit => scene.struckNotes.includes(digit))
            .map(digit => ({ cell: Number(cell), digit, role: 'excluded' })),
        ),
      };
      return `<section id="step-${index + 1}"><h2>${esc(
        page.title,
      )}</h2>${paras(body)}${figure(
        boardAsset(scene.values, masks, visuals),
        `${text.board} · ${ui.step} ${index + 1}. ${body}`,
      )}</section>`;
    })
    .join('');
}

for (const locale of ENABLED_LOCALES) {
  if (!copy[locale] || copy[locale].length !== 8)
    throw new Error(`Missing website copy: ${locale}`);
  const ui = LESSON_COPY[locale],
    labels = ARTICLE_LABELS[locale],
    basic = BASIC_LESSON_COPY[locale],
    termUi = TERM_CONCEPT_UI[locale];
  const name = code => HINT_PRESENTATION_COPIES[locale].techniques[code].name;
  const directory = [];
  for (const code of BASIC_COURSES) {
    const topic = `basics/${code}`,
      title = `${basic.titles[code]} · Sudoku`;
    shell(
      locale,
      topic,
      title,
      basicText(basic.pages[code][0].body, basicParams(code)),
      basicBody(locale, code),
    );
    directory.push([course(locale, topic), title]);
  }
  // Candidate and stuck guides answer a distinct search question while linking
  // to the complete app-derived lessons rather than duplicating their pages.
  for (const kind of ['pencil-marks', 'stuck']) {
    const candidate = TERM_CONCEPT_COPY[locale].candidate;
    const title = copy[locale][kind === 'pencil-marks' ? 3 : 4];
    const basics =
      kind === 'pencil-marks'
        ? ['how-to-play', 'certainty']
        : ['next-cell', 'certainty'];
    const techniques =
      kind === 'pencil-marks'
        ? ['nakedSingle', 'hiddenSingle', 'nakedPair', 'hiddenPair']
        : [
            'fullHouse',
            'nakedSingle',
            'hiddenSingle',
            'lockedCandidates.pointing',
            'nakedPair',
          ];
    const body = `<section id="routine"><h2>${esc(ui.method)}</h2>${
      kind === 'pencil-marks'
        ? paras(candidate.definition) +
          paras(candidate.find) +
          paras(candidate.mistake)
        : ''
    }${basicBody(
      locale,
      kind === 'pencil-marks' ? 'certainty' : 'next-cell',
    ).replaceAll('id="step-', 'id="example-step-')}${paras(
      copy[locale][5],
    )}${links(
      basics.map(code => [
        course(locale, `basics/${code}`),
        basic.titles[code],
      ]),
    )}</section><section id="techniques"><h2>${esc(
      ui.prerequisites,
    )}</h2>${links(
      techniques.map(code => [
        course(locale, `techniques/${slug(code)}`),
        name(code),
      ]),
    )}${links([
      [course(locale, 'concepts/candidate'), candidate.title],
    ])}</section>`;
    shell(
      locale,
      kind,
      title,
      `${kind === 'pencil-marks' ? candidate.definition : copy[locale][5]} ${
        basic.titles[basics[0]]
      }.`,
      body,
    );
    directory.push([course(locale, kind), title]);
  }
  for (const technique of TECHNIQUES) {
    const code = technique.code,
      topic = `techniques/${slug(code)}`,
      article = TECHNIQUE_ARTICLE_COPY[locale][code];
    const summaries = repository.listLessons(locale, code);
    let body = `<nav class="contents" aria-label="${esc(
      ui.proof,
    )}"><strong>${esc(ui.proof)}</strong>${links(
      summaries.map(summary => [
        `#${summary.id}`,
        ARTICLE_PATTERN_LABELS[locale][summary.pattern] ?? summary.title,
      ]),
    )}</nav>`;
    body += `<section id="pattern"><h2>${esc(labels.pattern)}</h2>${paras(
      article.pattern,
    )}<h3>${esc(labels.find)}</h3>${paras(article.find)}<h3>${esc(
      labels.result,
    )}</h3>${paras(article.result)}<h3>${esc(labels.mistake)}</h3>${paras(
      article.mistake,
    )}</section>`;
    for (const summary of summaries) {
      const lesson = repository.getLesson(summary.id, locale),
        example = lesson.example;
      const presentation = buildLessonPresentation(
        example,
        HINT_PRESENTATION_COPIES[locale],
      );
      body += `<section class="course-example" id="${
        lesson.id
      }" data-lesson-id="${lesson.id}" data-example-id="${
        example.id
      }"><h2>${esc(ui.proof)} · ${esc(
        ARTICLE_PATTERN_LABELS[locale][summary.pattern] ?? lesson.title,
      )}</h2>`;
      if (lesson.candidateBasis === 'applied_hint_sequence')
        body += `<p class="course-context">${esc(copy[locale][2])}</p>`;
      body += paras(copy[locale][6]);
      presentation.pages.forEach((page, index) => {
        const asset = boardAsset(
          example.values,
          example.candidateMasks,
          page.visuals,
        );
        body += `<details class="course-step"${
          index === 0 ? ' open' : ''
        }><summary>${esc(ui.step)} ${index + 1} · ${esc(
          page.title,
        )}</summary><div>${paras(page.body)}${figure(
          asset,
          page.accessibilitySummary,
        )}${
          page.visuals.candidateGroupLabels?.length
            ? paras(
                page.visuals.candidateGroupLabels
                  .map(group => `${group.id}: ${group.label}`)
                  .join(' · '),
              )
            : ''
        }</div></details>`;
      });
      body += `<div class="course-result"><h3>${esc(labels.result)}</h3>${paras(
        presentation.pages.at(-1).body,
      )}${figure(
        boardAsset(example.values, example.candidateMasks, {}, example.step),
        `${name(code)} · ${article.result}`,
      )}</div></section>`;
    }
    const previous =
      TECHNIQUES[Math.max(0, TECHNIQUES.findIndex(x => x.code === code) - 1)]
        .code;
    const next =
      TECHNIQUES[
        Math.min(
          TECHNIQUES.length - 1,
          TECHNIQUES.findIndex(x => x.code === code) + 1,
        )
      ].code;
    body += `<section id="related"><h2>${esc(ui.directory)}</h2>${links(
      [...new Set([previous, next])]
        .filter(x => x !== code)
        .map(x => [
          course(locale, `techniques/${slug(x)}`),
          `${x === previous ? ui.back : ui.next}: ${name(x)}`,
        ]),
    )}${links([
      [course(locale, 'pencil-marks'), copy[locale][3]],
      [course(locale, 'stuck'), copy[locale][4]],
    ])}</section>`;
    shell(
      locale,
      topic,
      `${name(code)} · ${ui.proof}`,
      `${article.pattern} ${article.result}`,
      body,
      summaries.map(x => x.id),
    );
  }
  for (const concept of TERM_CONCEPTS) {
    const text = TERM_CONCEPT_COPY[locale][concept],
      topic = `concepts/${slug(concept)}`;
    let body = `<section id="definition"><h2>${esc(
      termUi.definition,
    )}</h2>${paras(text.definition)}<h3>${esc(termUi.find)}</h3>${paras(
      text.find,
    )}<h3>${esc(termUi.mistake)}</h3>${paras(text.mistake)}</section>`;
    const renderScene = (scene, phase) => {
      const values = Array(81).fill(0),
        masks = Array(81).fill(0);
      scene.values.forEach(item => (values[item.cell] = item.digit));
      scene.candidates.forEach(
        item => (masks[item.cell] |= 1 << (item.digit - 1)),
      );
      return boardAsset(values, masks, {
        showFocusCells: phase > 0,
        focusCells: [
          ...scene.focus.map(x => x.cell),
          ...(scene.relatedCells ?? []),
        ],
        showFocusRegions: phase > 0,
        showPremises: false,
        showPlacements: false,
        showEliminations: false,
        diagramDigit: scene.diagramDigit,
        regionMarks: phase > 0 ? scene.regions : [],
        candidateMarks:
          phase > 0 ? scene.focus.map(x => ({ ...x, role: 'potential' })) : [],
        links: phase === 2 ? scene.links : [],
        colorMarks: phase > 0 ? scene.colors : [],
        finCandidates: phase === 2 ? scene.fins : [],
        candidateGroups:
          phase === 2 && scene.group
            ? [{ id: 1, candidates: scene.group }]
            : [],
        cellMarks:
          phase === 2 && scene.target
            ? [{ cell: scene.target.cell, role: 'eliminationTarget' }]
            : [],
      });
    };
    for (const pattern of conceptArticlePatterns(concept)) {
      const scene = conceptArticleScene(concept, pattern);
      const title =
        pattern === 'default'
          ? termUi.example
          : conceptArticlePatternLabel(locale, pattern);
      body += `<section id="pattern-${pattern}"><h2>${esc(title)}</h2>${paras(
        termUi.diagram,
      )}`;
      [termUi.observe, termUi.verify, termUi.conclude].forEach(
        (heading, phase) => {
          const caption = conceptDiagramCaption(locale, concept, scene);
          const explanation =
            conceptDiagramStep(locale, concept, scene, phase) ??
            [
              text.definition,
              text.find,
              TERM_EXAMPLE_CONCLUSION[locale][concept],
            ][phase];
          body += `<details class="course-step"${
            phase === 0 ? ' open' : ''
          }><summary>${esc(heading)}</summary><div>${paras(
            explanation,
          )}${figure(renderScene(scene, phase), caption)}${
            phase === 2 && scene.branchResults
              ? paras(
                  scene.branchResults
                    .map(
                      (removed, index) =>
                        `${termUi.branch} ${String.fromCharCode(65 + index)}: ${
                          removed ? termUi.removed : termUi.remains
                        }`,
                    )
                    .join(' · '),
                )
              : ''
          }${
            phase === 2 && scene.checkedBranches !== undefined
              ? paras(
                  scene.focus
                    .map(
                      (_, index) =>
                        `${termUi.branch} ${String.fromCharCode(65 + index)}: ${
                          index < scene.checkedBranches
                            ? termUi.covered
                            : termUi.notCovered
                        }`,
                    )
                    .join(' · '),
                )
              : ''
          }</div></details>`;
        },
      );
      body += '</section>';
    }
    body += `<section id="recognition"><h2>${esc(termUi.practice)}</h2>${paras(
      termUi.diagram,
    )}`;
    for (const question of TERM_CONCEPT_QUESTIONS[concept]) {
      const prompt = question.valid
        ? text.questionWhenValid ?? text.question
        : text.questionWhenInvalid ?? text.question;
      body += `<details class="course-step"><summary>${esc(
        termUi.practice,
      )} ${question.id.split('-').at(-1)}</summary><div>${paras(
        prompt,
      )}${figure(renderScene(question.scene, 2), termUi.diagram)}${
        question.scene.branchResults
          ? paras(
              question.scene.branchResults
                .map(
                  (removed, index) =>
                    `${termUi.branch} ${String.fromCharCode(65 + index)}: ${
                      removed ? termUi.removed : termUi.remains
                    }`,
                )
                .join(' · '),
            )
          : ''
      }${
        question.scene.checkedBranches !== undefined
          ? paras(
              question.scene.focus
                .map(
                  (_, index) =>
                    `${termUi.branch} ${String.fromCharCode(65 + index)}: ${
                      index < question.scene.checkedBranches
                        ? termUi.covered
                        : termUi.notCovered
                    }`,
                )
                .join(' · '),
            )
          : ''
      }<details><summary>${esc(termUi.conclude)}</summary>${paras(
        question.valid ? termUi.yes : termUi.no,
      )}</details></div></details>`;
    }
    body += '</section>';
    shell(
      locale,
      topic,
      `${text.title} · ${termUi.group}`,
      text.definition,
      body,
    );
  }
  const body = `<nav class="contents" aria-label="${esc(ui.directory)}">${links(
    [
      ['#basics', basic.group],
      ['#concepts', termUi.group],
      ...[1, 2, 3, 4, 5].map(level => [
        `#level-${level}`,
        `${ui.level} ${level}`,
      ]),
    ],
  )}</nav><section id="basics"><h2>${esc(basic.group)}</h2>${links(
    directory,
  )}</section><section id="concepts"><h2>${esc(termUi.group)}</h2>${links(
    TERM_CONCEPTS.map(code => [
      course(locale, `concepts/${slug(code)}`),
      TERM_CONCEPT_COPY[locale][code].title,
    ]),
  )}</section>${[1, 2, 3, 4, 5]
    .map(
      level =>
        `<section id="level-${level}"><h2>${esc(ui.level)} ${level}</h2>${links(
          TECHNIQUES.filter(item => item.level === level).map(item => [
            course(locale, `techniques/${slug(item.code)}`),
            name(item.code),
          ]),
        )}</section>`,
    )
    .join('')}`;
  shell(
    locale,
    '',
    copy[locale][0],
    `${basic.titles['how-to-play']} · ${termUi.group} · ${ui.proof} · Platon Sudoku App.`,
    body,
  );
  // Add a discoverable course entry, preserving all existing product copy.
  const target = path.join(publicDir, product(locale), 'index.html');
  let html = fs.readFileSync(target, 'utf8');
  const entry = `<a class="sudoku-course-entry" href="${course(locale)}">${esc(
    ui.directory,
  )}</a>`;
  if (!html.includes('class="sudoku-course-entry"'))
    html = html.replace('</nav>', `${entry}</nav>`);
  write(product(locale).slice(1) + 'index.html', html);
}
for (const [relative, svg] of assets) write(relative, svg);
// Keep the existing beginner-guide URL, board and design; add links to the
// complete app course collection and a direct store action on this page too.
const beginnerPath = path.join(
  publicDir,
  'guides/how-to-play-sudoku/index.html',
);
let beginner = fs.readFileSync(beginnerPath, 'utf8');
if (!beginner.includes('id="app-courses"'))
  beginner = beginner.replace(
    '<article>',
    `<article><aside class="contents" id="app-courses"><p>Explore complete courses adapted from the Platon Sudoku App.</p>${links(
      [
        [course('en'), 'Sudoku course directory'],
        [course('en', 'pencil-marks'), copy.en[3]],
        [course('en', 'stuck'), copy.en[4]],
      ],
    )}${download('en')}</aside>`,
  );
write('guides/how-to-play-sudoku/index.html', beginner);
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const sitemap = fs
  .readFileSync(sitemapPath, 'utf8')
  .replace(
    /\s*<url><loc>https:\/\/readytradie\.com\/guides\/sudoku\/[^<]*<\/loc><\/url>/g,
    '',
  );
write(
  'sitemap.xml',
  sitemap.replace(
    '</urlset>',
    `${pages
      .map(url => `  <url><loc>${url}</loc></url>`)
      .join('\n')}\n</urlset>`,
  ),
);
manifest.assets = [...assets.keys()];
const manifestPath = path.join(root, 'site/seo/sudoku-course-manifest.json');
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
if (checking) {
  if (fs.readFileSync(manifestPath, 'utf8') !== manifestText)
    differences.push('seo/sudoku-course-manifest.json');
  if (differences.length)
    throw new Error(
      `Stale course output (${differences.length} files): ${differences
        .slice(0, 8)
        .join(', ')}`,
    );
} else {
  const previous = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};
  for (const asset of previous.assets ?? [])
    if (asset.startsWith('guides/sudoku/boards/') && !assets.has(asset))
      fs.rmSync(path.join(publicDir, asset), { force: true });
  fs.writeFileSync(manifestPath, manifestText);
}
console.log(
  JSON.stringify({
    languages: ENABLED_LOCALES.length,
    pages: pages.length,
    techniques: TECHNIQUES.length,
    examples: catalog.lessons.length,
    concepts: TERM_CONCEPTS.length,
    boards: assets.size,
  }),
);
