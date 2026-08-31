# 生成结果

每次生成使用独立的 `content-v<版本>/` 目录，包含：

- `content.sqlite`：供 App 后续集成的只读题库。
- `puzzles.json` 和 `puzzles.csv`：供内容人员检查。
- `rating-report.json`：HoDoKu 原始等级、完整技巧统计和总步骤数。
- `manifest.json`：工具、配置、评级规则和产物校验信息。
- `audit/`：原始候选题、批量求解输入和 HoDoKu 输出。

真实发行题库应经过人工抽检后再复制到 App 资源目录。
