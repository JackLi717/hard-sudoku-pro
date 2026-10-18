"""Check discoverable pages, links, structured facts and worked puzzle examples."""

from html.parser import HTMLParser
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET


PUBLIC = Path(__file__).resolve().parents[1] / 'public'
REPOSITORY = PUBLIC.parents[1]
ORIGIN = 'https://readytradie.com'
SUDOKU_STORE = 'https://play.google.com/store/apps/details?id=com.platongames.sudoku'


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.links: list[str] = []
        self.assets: list[str] = []
        self.canonicals: list[str] = []
        self.alternates: dict[str, str] = {}
        self.meta: dict[str, str] = {}
        self.text: list[str] = []
        self.titles: list[str] = []
        self.headings: list[str] = []
        self.graphs: list[dict] = []
        self.examples: list[dict[str, str]] = []
        self.sudoku_cells: list[str] = []
        self._capture: str | None = None
        self._buffer = ''
        self._script: str | None = None
        self._sudoku = False
        self._tbody = False
        self._cell: str | None = None
        self.lang = ''
        self.direction = ''
        self.language_pickers = 0
        self.language_links: list[str] = []
        self.language_current: list[str] = []
        self._language_navigation = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key: value or '' for key, value in attrs}
        if tag == 'html':
            self.lang = attributes.get('lang', '')
            self.direction = attributes.get('dir', 'ltr')
        if tag == 'details' and 'language-picker' in attributes.get('class', '').split():
            self.language_pickers += 1
            assert 'open' not in attributes, 'Language picker must start collapsed'
        if tag == 'nav' and 'language-options' in attributes.get('class', '').split():
            self._language_navigation = True
        if 'id' in attributes:
            self.ids.append(attributes['id'])
        if tag == 'a':
            self.links.append(attributes.get('href', ''))
            if self._language_navigation:
                self.language_links.append(attributes.get('href', ''))
                if attributes.get('aria-current') == 'page':
                    self.language_current.append(attributes.get('href', ''))
        if tag == 'img':
            assert 'alt' in attributes, 'Image needs an alt attribute'
            assert 'width' in attributes and 'height' in attributes, 'Reserve image dimensions'
            self.assets.append(attributes['src'])
        if tag == 'link':
            relation = attributes.get('rel')
            if relation == 'canonical':
                self.canonicals.append(attributes['href'])
            elif relation == 'alternate':
                self.alternates[attributes['hreflang']] = attributes['href']
            elif relation in ['stylesheet', 'icon']:
                self.assets.append(attributes['href'])
        if tag == 'meta':
            self.meta[attributes.get('name', attributes.get('property', ''))] = attributes.get('content', '')
        if tag in ['title', 'h1']:
            self._capture = tag
            self._buffer = ''
        if tag == 'br' and self._capture:
            self._buffer += ' '
        if tag == 'script':
            assert attributes.get('type') == 'application/ld+json', 'Unexpected executable script'
            self._script = ''
        if tag == 'figure' and ('data-sudoku' in attributes or 'data-bottles' in attributes):
            self.examples.append(attributes)
        if tag == 'table' and 'sudoku-board' in attributes.get('class', '').split():
            self._sudoku = True
        if self._sudoku and tag == 'tbody':
            self._tbody = True
        if self._tbody and tag == 'td':
            self._cell = ''

    def handle_endtag(self, tag: str) -> None:
        if tag == 'nav':
            self._language_navigation = False
        if tag == self._capture:
            (self.titles if tag == 'title' else self.headings).append(normalize(self._buffer))
            self._capture = None
        if tag == 'script' and self._script is not None:
            self.graphs.append(json.loads(self._script))
            self._script = None
        if tag == 'td' and self._cell is not None:
            self.sudoku_cells.append(normalize(self._cell))
            self._cell = None
        if tag == 'tbody':
            self._tbody = False
        if tag == 'table':
            self._sudoku = False

    def handle_data(self, data: str) -> None:
        if self._script is not None:
            self._script += data
        else:
            self.text.append(data)
        if self._capture:
            self._buffer += data
        if self._cell is not None:
            self._cell += data


def normalize(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()


def target_path(url: str, page_path: Path) -> Path | None:
    parts = urlsplit(url)
    if parts.netloc and parts.netloc != 'readytradie.com':
        return None
    if parts.scheme and parts.scheme not in ['https', 'http']:
        return None
    path = unquote(parts.path)
    target = PUBLIC / path.lstrip('/') if path.startswith('/') else page_path.parent / path
    if not path:
        target = page_path
    if target.is_dir():
        target /= 'index.html'
    return target


def read_page(path: Path) -> Page:
    page = Page()
    page.feed(path.read_text())
    return page


def check_sudoku(example: dict[str, str], cells: list[str]) -> None:
    puzzle = example['data-sudoku']
    index = int(example['data-cell-index'])
    answer = int(example['data-candidate'])
    assert len(puzzle) == 81 and puzzle[index] == '0'
    board = [int(value) for value in puzzle]
    row, column = divmod(index, 9)
    peers = set(board[row * 9:row * 9 + 9])
    peers.update(board[r * 9 + column] for r in range(9))
    peers.update(board[r * 9 + c] for r in range(row // 3 * 3, row // 3 * 3 + 3)
                 for c in range(column // 3 * 3, column // 3 * 3 + 3))
    assert set(range(1, 10)) - peers == {answer}, 'Worked Sudoku deduction is not forced'
    assert cells == ['?' if i == index else (value if value != '0' else '·')
                     for i, value in enumerate(puzzle)], 'Displayed board differs from the checked example'
    catalog = json.loads((REPOSITORY / 'tools/puzzle-generator/output/content-v4/puzzles.json').read_text())
    assert any(item['puzzle'] == puzzle and int(item['solution'][index]) == answer for item in catalog), \
        'Use the existing verified content, without changing the puzzle dataset'


def check_water(examples: list[dict[str, str]]) -> None:
    previous: list[list[str]] | None = None
    for example in examples:
        state = json.loads(example['data-bottles'])
        capacity = int(example['data-capacity'])
        assert all(len(bottle) <= capacity for bottle in state)
        if previous is not None:
            source, target = map(int, example['data-pour'].split(','))
            expected = [bottle[:] for bottle in previous]
            origin, destination = expected[source], expected[target]
            assert source != target and origin and len(destination) < capacity
            color = origin[-1]
            assert not destination or destination[-1] == color, 'Illegal color match'
            count = 0
            for layer in reversed(origin):
                if layer != color:
                    break
                count += 1
            amount = min(count, capacity - len(destination))
            del origin[-amount:]
            destination.extend([color] * amount)
            assert expected == state, 'Worked water-sort pour does not produce the displayed state'
        previous = state
    assert previous is not None
    assert all(not bottle or (len(bottle) == capacity and len(set(bottle)) == 1) for bottle in previous), \
        'The tutorial must end on a solved board'


def main() -> None:
    public_files = {path.relative_to(PUBLIC).as_posix()
                    for path in PUBLIC.rglob('*') if path.is_file()}
    namespace = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
    urls = [element.text or '' for element in ET.parse(PUBLIC / 'sitemap.xml').findall(f'.//{namespace}loc')]
    assert len(urls) == len(set(urls)), 'Duplicate sitemap URL'
    pages: dict[str, Page] = {}
    for url in urls:
        assert url.startswith(ORIGIN + '/') and not urlsplit(url).query and not urlsplit(url).fragment
        path = target_path(url, PUBLIC / 'index.html')
        assert path is not None and path.is_file(), url
        page = read_page(path)
        pages[url] = page
        assert page.lang and len(page.titles) == 1 and len(page.headings) == 1, url
        assert page.meta.get('description') and page.canonicals == [url], url
        assert 'noindex' not in page.meta.get('robots', '').lower(), url
        assert page.meta.get('og:url') == url and page.meta.get('og:title') == page.titles[0], url
        assert len(page.ids) == len(set(page.ids)), f'Duplicate ID: {url}'
        assert page.graphs, f'Missing semantic data: {url}'
        for link in page.links + page.assets:
            target = target_path(link, path)
            if target is None:
                continue
            assert target.is_file(), f'Broken local link or asset: {url} → {link}'
            assert target.relative_to(PUBLIC).as_posix() in public_files, \
                f'Local path casing differs from deployed filename: {url} → {link}'
            fragment = urlsplit(link).fragment
            if fragment and target.suffix == '.html':
                assert fragment in read_page(target).ids, f'Broken anchor: {url} → {link}'
        for graph in page.graphs:
            assert graph['@context'] == 'https://schema.org'
            for node in graph['@graph']:
                kinds = node['@type'] if isinstance(node['@type'], list) else [node['@type']]
                if 'MobileApplication' in kinds:
                    text = normalize(' '.join(page.text))
                    assert normalize(node['description']) in text
                    if 'conditionsOfAccess' in node:
                        assert normalize(node['conditionsOfAccess']) in text
                    if url.startswith(ORIGIN + '/platon-sudoku/'):
                        assert 'conditionsOfAccess' not in node, 'Keep release workflow out of product metadata'
                    assert all(target_path(src, path).is_file() for src in node['screenshot'])
                    assert not any(key in node for key in ['aggregateRating', 'review', 'offers'])
                if 'Article' in kinds:
                    assert node['headline'] == page.headings[0]
                if 'BreadcrumbList' in kinds:
                    trail = node['itemListElement']
                    assert [item['position'] for item in trail] == list(range(1, len(trail) + 1))
                    assert trail[-1]['item'] == url
        for example in page.examples:
            if 'data-sudoku' in example:
                check_sudoku(example, page.sudoku_cells)
        water = [example for example in page.examples if 'data-bottles' in example]
        if water:
            check_water(water)
        print(f'PASS {url}: metadata, schema, local links and worked examples')
    assert len({page.titles[0] for page in pages.values()}) == len(pages), 'Duplicate titles'
    assert len({page.meta['description'] for page in pages.values()}) == len(pages), 'Duplicate descriptions'
    for page in pages.values():
        for lang, url in page.alternates.items():
            assert url in pages and pages[url].alternates == page.alternates, 'Language alternatives must be reciprocal'
            if lang != 'x-default':
                assert pages[url].lang.lower() == lang.lower()
    sudoku_languages = {
        lang: f'{ORIGIN}/platon-sudoku/' + (f'{slug}/' if slug else '')
        for lang, slug in {
            'en': '', 'de': 'de', 'ja': 'ja', 'ko': 'ko',
            'fr': 'fr', 'es': 'es', 'pt-BR': 'pt-br', 'zh-Hant': 'zh-hant',
            'it': 'it', 'id': 'id', 'ru': 'ru', 'zh-Hans': 'zh-hans',
            'vi': 'vi', 'hi': 'hi', 'uk': 'uk', 'ro': 'ro', 'fi': 'fi',
            'ar': 'ar', 'tr': 'tr', 'th': 'th', 'pl': 'pl', 'nl': 'nl',
            'ms': 'ms', 'fil': 'fil',
        }.items()
    }
    expected_alternates = {**sudoku_languages, 'x-default': sudoku_languages['en']}
    stylesheet = '/games.css?v=' + hashlib.sha256((PUBLIC / 'games.css').read_bytes()).hexdigest()[:12]
    for lang, url in sudoku_languages.items():
        page = pages[url]
        assert page.lang == lang and page.alternates == expected_alternates, url
        assert not {'release-status', 'final-release-status'} & set(page.ids), url
        assert stylesheet in page.assets, f'Stale product stylesheet fingerprint: {url}'
        assert page.direction == ('rtl' if lang == 'ar' else 'ltr'), url
        assert SUDOKU_STORE in page.links, f'Missing public store entry: {url}'
        assert '/platon-sudoku/images/google-play-qr.png' in page.assets, url
        assert not any('/apps/testing/' in link for link in page.links), url
        assert page.language_pickers == 1, f'Missing compact language picker: {url}'
        assert page.language_links == [alternate.removeprefix(ORIGIN)
                                       for alternate in sudoku_languages.values()], url
        assert page.language_current == [url.removeprefix(ORIGIN)], url
    homepage = pages[ORIGIN + '/']
    assert homepage.language_pickers == 1
    assert 'home-release-status' not in homepage.ids
    assert stylesheet in homepage.assets
    assert homepage.language_links == [url.removeprefix(ORIGIN) for url in sudoku_languages.values()]
    print(f'PASS {len(sudoku_languages)} Sudoku languages: public store links, QR asset and language navigation')
    print(f'PASS {len(pages)} canonical sitemap pages; unique metadata and reciprocal language alternatives')


if __name__ == '__main__':
    main()
