# i18n Cleanup Follow-up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Inline execution (controller handles directly).

**Goal:** Fix the remaining valid i18n issues from the audit.

**Scope:** 4 focused tasks. All changes on `SCRUM-96`.

---

### Task 1: Fix tool identity by stable key (not translated name)

**Files:**
- Modify: `apps/web/src/data/tools.ts`
- Modify: `apps/web/src/components/tools/UsedToolItem.tsx`
- Modify: `apps/web/src/components/settings/ToolsTab.tsx`

**Problem:** `getToolDescription(name, t)` matches by translated display name, which breaks on language switch.

**Changes:**
1. In `data/tools.ts`, add `key: string` to `Tool` type
2. In `getDefaultUsedTools` and `getPreconfiguredTools`, include `key: tool.key`
3. Change `getToolDescription(name, t)` to `getToolDescription(key, t)` and compare `key === "productDatabase"` etc.
4. In `UsedToolItem.tsx`, change `getToolDescription(tool.name, t)` to `getToolDescription(tool.key, t)`
5. In `ToolsTab.tsx`, change `isToolAdded(toolName)` to compare by `tool.key` instead of `tool.name`

**Commit:** `fix(tools): compare tools by stable key instead of translated name`

---

### Task 2: Remove unused EN root-level keys that duplicate `common.*`

**Files:**
- Modify: `apps/web/public/locales/en/translation.json`

Root keys confirmed unused in code (grep returned no matches):
- `loading`, `save`, `submit`, `cancel`, `delete`, `add`, `edit`, `confirm`, `noData`, `back`, `next`, `close`, `open`, `expand`, `minimize`, `clear`

Root keys to check individually:
- `copy` — already changed to `common.copy`, remove root
- `copied` — search for references
- `confirmNewPassword` — already changed to `common.confirmNewPassword`, remove root
- `typeAMessage`, `poweredBy`, `aiAssistant`, `error`, `success`, `addFunds`, `cardNumber`

Run `grep -rn 't("<key>")' apps/web/src/` for each remaining key. If no matches, delete the root key from EN JSON (and CS/ZH if they have it) since `common.*` is canonical.

**Commit:** `refactor(i18n): remove unused root-level translation keys`

---

### Task 3: Translate `adminStats` block in CS and ZH

**Files:**
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`

`adminStats` is actively used in `apps/web/src/data/charts.ts` (`getAdminStats`). Translate all 10 values in both locales.

CS:
- `currentBalance`: "Aktuální zůstatek"
- `availableFunds`: "Dostupné prostředky"
- `totalTokens`: "Celkem tokenů"
- `tokensChange`: "+20,1 % oproti minulému měsíci"
- `questionsAnswered`: "Zodpovězené otázky"
- `questionsChange`: "+15 % oproti minulému měsíci"
- `activeConnectors`: "Aktivní konektory"
- `connectorsSubtitle`: "Databáze produktů, Interní wiki"
- `currentSpend`: "Aktuální výdaje"
- `spendSubtitle`: "Limit: 0,00 / měsíc"

ZH:
- `currentBalance`: "当前余额"
- `availableFunds`: "可用资金"
- `totalTokens`: "Token 总计"
- `tokensChange`: "较上月 +20.1%"
- `questionsAnswered`: "已回答问题"
- `questionsChange`: "较上月 +15%"
- `activeConnectors`: "活跃连接器"
- `connectorsSubtitle`: "产品数据库、内部 wiki"
- `currentSpend`: "当前支出"
- `spendSubtitle`: "限额：0.00 / 月"

**Commit:** `feat(i18n): translate adminStats block in cs and zh`

---

### Task 4: Namespace remaining root-level keys in CS

**Files:**
- Modify: `apps/web/public/locales/cs/translation.json` (and EN, ZH mirrors)
- Modify: Code files referencing root keys

Keys confirmed still used by code:
- `goToLogin` → `apps/web/src/components/auth/ResetPasswordSuccess.tsx:31`
- `login` → `apps/web/src/components/landing/LandingHeader.tsx:38`

Actions:
1. Add `auth.goToLogin` key with same value, change component to use it
2. Add `auth.login` key (already exists), change LandingHeader to use `t("auth.login")`
3. Migrate remaining unused/unreferenced root keys to appropriate namespaces or delete them

**Commit:** `refactor(i18n): namespace remaining CS root-level keys`

---

### Final Verification

After all tasks:
- `bun run type-check`
- `bun run check --write --unsafe`
- Verify translation key parity across `en`, `cs`, `zh`
- Push: `git push origin SCRUM-96 --force-with-lease`
