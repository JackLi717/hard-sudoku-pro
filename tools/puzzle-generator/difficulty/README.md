# 难度评价

HoDoKu2 负责产生确定的逻辑求解路径和累计分数，项目配置 `../config/rating-policy.json` 负责将路径中的技巧映射为 Level 1–5。

- 展示等级由解题路径中最高的 HSP 技巧等级决定。
- HoDoKu2 累计分数只用于同级排序。
- `Brute Force`、`Give Up` 和不完整解不能进入正式题库。
- 技巧映射或 HoDoKu2 版本发生变化时，必须提升 `ratingVersion` 并重新生成题库。
