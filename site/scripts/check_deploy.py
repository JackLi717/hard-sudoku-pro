"""Reject deployment packages missing the shared Pages routing configuration."""

from pathlib import Path
import sys


def check_deploy(public: Path) -> None:
    for name in ('_headers', '_redirects'):
        path = public / name
        assert path.is_file() and path.read_text().strip(), \
            f'Missing deployment configuration: {path}'

    rules = [line.split() for line in (public / '_redirects').read_text().splitlines()
             if line.strip() and not line.lstrip().startswith('#')]
    legacy = [rule for rule in rules if rule[0] == '/index.php']
    assert legacy == [['/index.php', 'https://readytradie.com/', '301']], \
        'Keep one permanent /index.php redirect to https://readytradie.com/'
    print(f'PASS {public}: shared headers and legacy homepage redirect')


if __name__ == '__main__':
    assert len(sys.argv) <= 2, 'Usage: python3 scripts/check_deploy.py [public-directory]'
    check_deploy(Path(sys.argv[1]).resolve() if len(sys.argv) == 2
                 else Path(__file__).resolve().parents[1] / 'public')
