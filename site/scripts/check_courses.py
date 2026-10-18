"""Verify complete App-course coverage and the published conclusion diagrams."""

import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'site/public'
manifest = json.loads((ROOT / 'site/seo/sudoku-course-manifest.json').read_text())
catalog = json.loads((ROOT / 'src/data/lessons/generated/lesson-catalog.json').read_text())
lessons = {item['lesson_id']: item for item in catalog['lessons']}
assert set(manifest['lessonIds']) == set(lessons)
assert set(manifest['techniques']) == {item['technique_code'] for item in lessons.values()}
for source, checksum in manifest['sources'].items():
    assert hashlib.sha256((ROOT / source).read_bytes()).hexdigest() == checksum, source

svg_cache = {}


def asset(src):
    if src not in svg_cache:
        path = PUBLIC / src.lstrip('/')
        svg = ET.parse(path).getroot()
        svg_cache[src] = (svg, json.loads(svg.find('{http://www.w3.org/2000/svg}metadata').text))
    return svg_cache[src]


expected_topics = len(manifest['techniques']) + len(manifest['basicCourses']) + len(manifest['concepts']) + 3
for locale in manifest['locales']:
    localized = [page for page in manifest['pages'] if page['locale'] == locale]
    assert len(localized) == expected_topics
    represented = []
    for page in localized:
        path = PUBLIC / page['url'].removeprefix('https://readytradie.com/') / 'index.html'
        markup = path.read_text()
        assert markup.count('class="course-source"') == 1
        assert markup.count('https://play.google.com/store/apps/details?id=com.platongames.sudoku') >= 2
        assert 'class="sudoku-course-entry"' not in markup
        assert '<html lang="' + locale + '"' in markup
        for lesson_id in page['lessonIds']:
            represented.append(lesson_id)
            item = lessons[lesson_id]
            example = item['example']
            section = re.search(r'<section class="course-example" id="' + re.escape(lesson_id) + r'".*?</section>', markup).group()
            assert 'data-example-id="' + example['example_id'] + '"' in section
            images = re.findall(r'<img src="([^"]+)"', section)
            assert len(images) >= 3, lesson_id
            for src in images:
                _, data = asset(src)
                assert data['values'] == [int(value) or None for value in example['board_fingerprint']], lesson_id
                assert data['masks'] == example['candidate_masks'], lesson_id
            final, data = asset(images[-1])
            assert data['result'] == example['step'], lesson_id
            texts = final.findall('{http://www.w3.org/2000/svg}text')
            for placement in example['step']['placements']:
                assert any(text.get('data-cell') == str(placement['cell']) and text.get('data-value') == str(placement['digit']) for text in texts), lesson_id
            for elimination in example['step']['eliminations']:
                assert any(text.get('data-cell') == str(elimination['cell']) and text.get('data-candidate') == str(elimination['digit']) and text.get('text-decoration') == 'line-through' for text in texts), lesson_id
    assert len(represented) == len(lessons) and set(represented) == set(lessons), locale

for relative in manifest['assets']:
    svg, data = asset('/' + relative)
    assert Path(relative).stem == hashlib.sha256((PUBLIC / relative).read_bytes()).hexdigest()[:24]
    assert len(data['values']) == len(data['masks']) == 81
    # Speculative deductions must stay small candidate marks, not saved values.
    if data['result'] is None:
        shown = {int(text.get('data-cell')): int(text.get('data-value'))
                 for text in svg.findall('{http://www.w3.org/2000/svg}text') if text.get('data-value')}
        assert shown == {cell: value for cell, value in enumerate(data['values']) if value}
    colored = svg.findall('*[@data-color-state]')
    for mark in data['visuals'].get('colorMarks', []):
        state = 'A' if mark['color'] == 0 else 'B'
        shape = 'circle' if state == 'A' else 'rect'
        assert any(element.tag.endswith('}' + shape) and element.get('data-color-component') == str(mark['component']) and element.get('data-color-state') == state for element in colored), relative
print(f"PASS {len(manifest['locales'])} languages: all {len(lessons)} App examples, {len(manifest['techniques'])} techniques, {len(manifest['basicCourses'])} basic courses and {len(manifest['concepts'])} concepts")
print(f"PASS {len(manifest['pages'])} course pages and {len(manifest['assets'])} diagrams: source states, actual conclusions, candidate semantics, A/B shapes, content hashes and download links")
