# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指导。

## 仓库用途

这是跨境电商订单核算与物流优化 AI 助手对应的知识库与系统提示词配置仓库。AI 助手帮助卖家批量核对订单金额，并在订单未发出前根据产品 SKU 和目的地邮编找出最经济的跨境物流发货方式。

## 项目结构

- **`系统提示词.md`** — 核心系统提示词，定义了 AI 助手的角色、能力、计算规则和输出格式。修改行为、公式或新增物流渠道时，主要编辑此文件。
- **`产品数据库.xlsx`** — 产品数据库，约 280+ 个 SKU，包含长宽高(cm)和毛重(kg)。部分 SKU 有颜色变体，毛重可能略有差异。
- **`商仓物流2026报价.xlsx`** — 商仓三个渠道的费率表：FedEx Ground\&HD、FDX Ground Economy、Amazon Shipping。
- **`Fimile-20260424.xlsx`** — Fimile Ground 费率表。
- **`GOFO Ground 20260415.xlsx`** — GOFO Ground 费率表。
- **`CG价卡.pdf`** — CG 仓价卡（3.1.1 US Pick & Ship Standard），仅在用户明确询问 CG 仓发货时启用。
- **`zbhome_2026_3_账单update.xlsx`** — 订单账单数据，用于对账。

## 系统提示词结构

`系统提示词.md` 按以下章节组织：

1. **角色定位** — 助手身份声明与预置知识库说明
2. **核心功能**:
   - 订单批量对账：`应收 = 商品总价 + 运费 + 税 - 折扣 - 平台补贴`，`实收 = 买家支付金额 - 平台费用`，`差异 = 应收 - 实收`，差异为 0 则正常，否则异常
   - 五大物流渠道并行比价，按总费用升序排列，标注最便宜的 1-2 个方案
3. **知识储备与计算规则** — 通用公式，然后五个渠道各一节详细说明，外加 CG Pick & Ship 备用逻辑
4. **输出格式** — 对账结果和物流推荐的 Markdown 表格规范
5. **注意事项** — 使用免责声明（估算值、不执行真实交易等）

## 核心计算规则

**五个渠道通用公式：**

- 计费重 = max(实重, 体积重)
- 体积重 = 长×宽×高(inch) / 体积除数
- 总费用 = 基础运费 + 最高附加费 + 住宅附加费(如适用) + 偏远附加费(如适用) + (基础运费 + 最高附加费) × 燃油费率

**单位换算：** 1 kg = 2.20462 lbs，1 inch = 2.54 cm

**五大渠道参数对比：**

| 渠道                    | 体积除数 | 住宅附加费 | 燃油费率(默认) |
| --------------------- | ---- | ----- | -------- |
| 商仓 FedEx Ground\&HD   | 270  | $3.00 | 20%      |
| 商仓 FDX Ground Economy | 139  | 无     | 20%      |
| 商仓 Amazon Shipping    | 300  | 无     | 20%      |
| Fimile Ground         | 250  | 无     | 20%      |
| GOFO Ground           | 250  | $3.00 | 20%      |

**附加费规则：** AHS-Dim、AHS-Weight、AHS-Packaging、Oversize 四项互斥，仅收取其中最高的一项，不重复收取。

**分区逻辑：** 根据目的地邮编前三位和发货仓（CA/NJ/TX/SAV）查表确定 Zone。未指定发货仓时默认 CA，并在结果中提示。

## 系统修改指南

- **新增物流渠道：** 在 `系统提示词.md` 的"知识储备与计算规则"章节下新增一节，参照现有渠道模板（体积除数、附加费表、燃油费率、住宅附加费、偏远附加费、参考时效）。
- **更新费率：** 替换对应的 Excel/PDF 源文件，并同步更新 `系统提示词.md` 中相关数据。
- **修改对账逻辑：** 编辑"核心功能"第 1 节中的公式和状态判定规则。
- 燃油费率以官网实时数据为准，缺失时暂按 20% 估算。
- 所有金额默认以 USD 为单位，保留两位小数。

<br />

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## **1. Think Before Coding**

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## **2. Simplicity First**

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## **3. Surgical Changes**

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## **4. Goal-Driven Execution**

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

***

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

