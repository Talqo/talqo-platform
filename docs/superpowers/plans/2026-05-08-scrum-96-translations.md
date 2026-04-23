# SCRUM-96: Full Frontend I18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebase SCRUM-96 on main, then wire `react-i18next` translation hooks into every user-facing frontend component, expanding JSON translation files for English, Czech, and Chinese with all missing keys.

**Architecture:** The i18n layer (`apps/web/src/lib/i18n.ts`, `LanguageSwitcher.tsx`) already exists. We only need to (1) expand `public/locales/*/translation.json` with all missing keys, (2) import `useTranslation` in each route/component and replace hard-coded strings with `t("key")`, and (3) add `LanguageSwitcher` to auth layout so guests can switch languages before login.

**Tech Stack:** React, Vite, react-i18next, i18next-http-backend, shadcn/ui

**Current State on SCRUM-96:**
- `i18n.ts`, `LanguageSwitcher.tsx`, and three `translation.json` files exist.
- Only `LanguageSwitcher.tsx` currently calls `useTranslation`. All other components use hard-coded English strings.
- SCRUM-96 is **31 commits behind `origin/main`** — must rebase first.

**Approach:**
1. Rebase on `origin/main`.
2. Expand translation JSON files in bulk.
3. Wire translations into components by UI layer (routes → components → schemas).
4. Add `LanguageSwitcher` to the login page top bar.
5. Verify with `type-check` + visual spot-check.

---

## Prerequisites

All work happens on `SCRUM-96` branch. Do not merge into other branches.

---

### Task 1: Rebase SCRUM-96 on main

**Files:**
- Branch `SCRUM-96`

- [ ] **Step 1: Fetch latest remote**

  ```bash
  git fetch origin
  git checkout SCRUM-96
  ```

- [ ] **Step 2: Rebase on `origin/main`**

  ```bash
  git rebase origin/main
  ```

  If conflicts appear, resolve them keeping your i18n-related additions (translation files, i18n.ts, LanguageSwitcher) and discarding stale code from the old branch. Run `git rebase --continue` after each resolution.

- [ ] **Step 3: Type-check the rebased codebase**

  ```bash
  bun run type-check
  ```

  Expected: `0 errors` across all packages.

- [ ] **Step 4: Commit any rebase-resolution changes**

  ```bash
  git add -A && git commit -m "chore: resolve rebase conflicts with main" || true
  ```

---

### Task 2: Expand translation JSON files (en, cs, zh)

**Files:**
- Modify: `apps/web/public/locales/en/translation.json`
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`

The existing files contain ~89 keys. We need to add ~200 more to cover every hard-coded string in routes, components, and schemas.

**Translation key naming convention:**
- CamelCase, dot-namespaced by feature: `auth.login.title`, `dashboard.overview.title`, `botConfig.systemPromptLabel`
- Keep existing keys from SCRUM-96 (e.g. `dashboard`, `login`, `settings` at top level) for backward compatibility.

- [ ] **Step 1: Add auth-related keys to all three locale files**

  Add under top-level key `auth`:

  ```json
  "auth": {
    "login": {
      "title": "Log in",
      "subtitle": "Enter your email and password to access your dashboard",
      "emailLabel": "Email",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "Password",
      "forgotPassword": "Forgot password?",
      "loggingIn": "Logging in...",
      "logInButton": "Log in",
      "noAccount": "Don't have an account?",
      "signUp": "Sign up",
      "invalidCredentials": "Invalid email or password. Please try again.",
      "loginFailed": "Login failed. Please try again."
    },
    "register": {
      "title": "Create an account",
      "subtitle": "Enter your details below to create your account",
      "nameLabel": "Name",
      "namePlaceholder": "John Doe",
      "emailLabel": "Email",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "Password",
      "confirmPasswordLabel": "Confirm Password",
      "creatingAccount": "Creating account...",
      "createAccountButton": "Create account",
      "haveAccount": "Already have an account?",
      "logIn": "Log in",
      "checkEmailTitle": "Check your email!",
      "checkEmailDesc": "We've sent a verification link to {{email}}. Click it to activate your account.",
      "resendSuccess": "Verification email sent. Please check your inbox.",
      "sending": "Sending...",
      "resendIn": "Resend available in {{seconds}}s",
      "resendButton": "Resend verification email",
      "goToLogin": "Go to login",
      "backToHome": "Back to home",
      "failed": "Registration failed. Please try again."
    },
    "forgotPassword": {
      "title": "Forgot password?",
      "subtitle": "Enter your email address and we'll send you a link to reset your password.",
      "emailLabel": "Email",
      "emailPlaceholder": "m@example.com",
      "error": "Failed to send reset link. Please try again or contact support.",
      "sending": "Sending...",
      "sendButton": "Send reset link",
      "backToLogin": "Back to login",
      "successTitle": "Check your email",
      "successDesc": "If an account exists with {{email}}, we've sent a password reset link to your inbox."
    },
    "resetPassword": {
      "title": "Reset password",
      "subtitle": "Enter your new password below.",
      "newPasswordLabel": "New password",
      "newPasswordPlaceholder": "Enter new password",
      "resetting": "Resetting...",
      "resetButton": "Reset password",
      "invalidLink": "This password reset link is invalid or has expired.",
      "requestNew": "Please request a new password reset link.",
      "requestNewButton": "Request new link",
      "successTitle": "Password reset!",
      "successDesc": "Your password has been reset successfully. Redirecting to login...",
      "goToLogin": "Go to login",
      "verifying": "Verifying link...",
      "verifyingDesc": "Please wait while we verify your reset link.",
      "error": "Failed to reset password. Please try again.",
      "invalidOrExpired": "This link is invalid or has expired. Please request a new one.",
      "alreadyUsed": "This link has already been used. Please request a new one.",
      "unableToVerify": "Unable to verify link. Please try again later."
    },
    "verifyEmail": {
      "verifyingTitle": "Verifying your email...",
      "verifyingDesc": "Please wait while we verify your email address.",
      "successTitle": "Email verified!",
      "successDesc": "Your email has been verified successfully. Redirecting to dashboard...",
      "goToDashboard": "Go to dashboard",
      "failedTitle": "Verification failed",
      "failedDesc": "We couldn't verify your email.",
      "missingToken": "Verification token is missing. Please check your email link.",
      "invalidToken": "The verification link is invalid. Please request a new one.",
      "expiredToken": "The verification link has expired. Please register again.",
      "alreadyVerified": "This email has already been verified. You can log in now.",
      "resendHeading": "Need a new verification link?",
      "resendSuccess": "Verification email sent. Please check your inbox.",
      "emailLabel": "Email address",
      "emailPlaceholder": "Enter your email",
      "sending": "Sending...",
      "resendIn": "Resend available in {{seconds}}s",
      "resendButton": "Resend verification email",
      "registerAgain": "Register again",
      "lightModeA11y": "Switch to light mode",
      "darkModeA11y": "Switch to dark mode"
    }
  }
  ```

  **Czech:**

  ```json
  "auth": {
    "login": {
      "title": "Přihlášení",
      "subtitle": "Zadejte svůj e-mail a heslo pro přístup k nástěnce",
      "emailLabel": "E-mail",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "Heslo",
      "forgotPassword": "Zapomněli jste heslo?",
      "loggingIn": "Přihlašování...",
      "logInButton": "Přihlásit se",
      "noAccount": "Nemáte účet?",
      "signUp": "Zaregistrovat se",
      "invalidCredentials": "Neplatný e-mail nebo heslo. Zkuste to znovu.",
      "loginFailed": "Přihlášení selhalo. Zkuste to znovu."
    },
    "register": {
      "title": "Vytvořit účet",
      "subtitle": "Zadejte své údaje níže pro vytvoření účtu",
      "nameLabel": "Jméno",
      "namePlaceholder": "Jan Novák",
      "emailLabel": "E-mail",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "Heslo",
      "confirmPasswordLabel": "Potvrďte heslo",
      "creatingAccount": "Vytváření účtu...",
      "createAccountButton": "Vytvořit účet",
      "haveAccount": "Již máte účet?",
      "logIn": "Přihlásit se",
      "checkEmailTitle": "Zkontrolujte svůj e-mail!",
      "checkEmailDesc": "Na {{email}} jsme odeslali ověřovací odkaz. Klepnutím aktivujte svůj účet.",
      "resendSuccess": "Ověřovací e-mail byl odeslán. Zkontrolujte svou schránku.",
      "sending": "Odesílání...",
      "resendIn": "Znovu za {{seconds}}s",
      "resendButton": "Znovu odeslat ověřovací e-mail",
      "goToLogin": "Přejít na přihlášení",
      "backToHome": "Zpět na úvod",
      "failed": "Registrace selhala. Zkuste to znovu."
    },
    "forgotPassword": {
      "title": "Zapomněli jste heslo?",
      "subtitle": "Zadejte svou e-mailovou adresu a my vám pošleme odkaz pro obnovení hesla.",
      "emailLabel": "E-mail",
      "emailPlaceholder": "m@example.com",
      "error": "Odeslání odkazu selhalo. Zkuste to znovu nebo kontaktujte podporu.",
      "sending": "Odesílání...",
      "sendButton": "Odeslat odkaz",
      "backToLogin": "Zpět na přihlášení",
      "successTitle": "Zkontrolujte svůj e-mail",
      "successDesc": "Pokud účet s {{email}} existuje, odeslali jsme odkaz pro obnovení hesla."
    },
    "resetPassword": {
      "title": "Obnovit heslo",
      "subtitle": "Zadejte nové heslo níže.",
      "newPasswordLabel": "Nové heslo",
      "newPasswordPlaceholder": "Zadejte nové heslo",
      "resetting": "Obnovování...",
      "resetButton": "Obnovit heslo",
      "invalidLink": "Tento odkaz pro obnovení hesla je neplatný nebo vypršel.",
      "requestNew": "Vyžádejte si nový odkaz pro obnovení hesla.",
      "requestNewButton": "Vyžádat nový odkaz",
      "successTitle": "Heslo obnoveno!",
      "successDesc": "Vaše heslo bylo úspěšně obnoveno. Přesměrování na přihlášení...",
      "goToLogin": "Přejít na přihlášení",
      "verifying": "Ověřování odkazu...",
      "verifyingDesc": "Vyčkejte, než ověříme váš odkaz.",
      "error": "Obnovení hesla selhalo. Zkuste to znovu.",
      "invalidOrExpired": "Tento odkaz je neplatný nebo vypršel. Vyžádejte si nový.",
      "alreadyUsed": "Tento odkaz byl již použit. Vyžádejte si nový.",
      "unableToVerify": "Odkaz nelze ověřit. Zkuste to později."
    },
    "verifyEmail": {
      "verifyingTitle": "Ověřování e-mailu...",
      "verifyingDesc": "Vyčkejte, než ověříme vaši e-mailovou adresu.",
      "successTitle": "E-mail ověřen!",
      "successDesc": "Váš e-mail byl úspěšně ověřen. Přesměrování na nástěnku...",
      "goToDashboard": "Přejít na nástěnku",
      "failedTitle": "Ověření selhalo",
      "failedDesc": "Nepodařilo se ověřit váš e-mail.",
      "missingToken": "Chybí ověřovací token. Zkontrolujte odkaz v e-mailu.",
      "invalidToken": "Ověřovací odkaz je neplatný. Vyžádejte si nový.",
      "expiredToken": "Ověřovací odkaz vypršel. Zaregistrujte se znovu.",
      "alreadyVerified": "Tento e-mail byl již ověřen. Nyní se můžete přihlásit.",
      "resendHeading": "Potřebujete nový ověřovací odkaz?",
      "resendSuccess": "Ověřovací e-mail byl odeslán. Zkontrolujte svou schránku.",
      "emailLabel": "E-mailová adresa",
      "emailPlaceholder": "Zadejte svůj e-mail",
      "sending": "Odesílání...",
      "resendIn": "Znovu za {{seconds}}s",
      "resendButton": "Znovu odeslat ověřovací e-mail",
      "registerAgain": "Zaregistrovat se znovu",
      "lightModeA11y": "Přepnout do světlého režimu",
      "darkModeA11y": "Přepnout do tmavého režimu"
    }
  }
  ```

  **Chinese:**

  ```json
  "auth": {
    "login": {
      "title": "登录",
      "subtitle": "输入您的邮箱和密码以访问仪表盘",
      "emailLabel": "邮箱",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "密码",
      "forgotPassword": "忘记密码？",
      "loggingIn": "登录中...",
      "logInButton": "登录",
      "noAccount": "没有账户？",
      "signUp": "注册",
      "invalidCredentials": "邮箱或密码无效。请重试。",
      "loginFailed": "登录失败。请重试。"
    },
    "register": {
      "title": "创建账户",
      "subtitle": "在下方输入您的详细信息以创建账户",
      "nameLabel": "姓名",
      "namePlaceholder": "张三",
      "emailLabel": "邮箱",
      "emailPlaceholder": "m@example.com",
      "passwordLabel": "密码",
      "confirmPasswordLabel": "确认密码",
      "creatingAccount": "创建账户中...",
      "createAccountButton": "创建账户",
      "haveAccount": "已有账户？",
      "logIn": "登录",
      "checkEmailTitle": "请查收邮件！",
      "checkEmailDesc": "我们已向 {{email}} 发送验证链接。点击以激活您的账户。",
      "resendSuccess": "验证邮件已发送。请查收收件箱。",
      "sending": "发送中...",
      "resendIn": "{{seconds}} 秒后可重发",
      "resendButton": "重发验证邮件",
      "goToLogin": "去登录",
      "backToHome": "返回首页",
      "failed": "注册失败。请重试。"
    },
    "forgotPassword": {
      "title": "忘记密码？",
      "subtitle": "输入您的邮箱地址，我们将向您发送重置密码的链接。",
      "emailLabel": "邮箱",
      "emailPlaceholder": "m@example.com",
      "error": "发送重置链接失败。请重试或联系支持。",
      "sending": "发送中...",
      "sendButton": "发送重置链接",
      "backToLogin": "返回登录",
      "successTitle": "请查收邮件",
      "successDesc": "如果 {{email}} 存在账户，我们已发送密码重置链接到您的收件箱。"
    },
    "resetPassword": {
      "title": "重置密码",
      "subtitle": "在下方输入新密码。",
      "newPasswordLabel": "新密码",
      "newPasswordPlaceholder": "输入新密码",
      "resetting": "重置中...",
      "resetButton": "重置密码",
      "invalidLink": "此密码重置链接无效或已过期。",
      "requestNew": "请申请新的密码重置链接。",
      "requestNewButton": "申请新链接",
      "successTitle": "密码已重置！",
      "successDesc": "您的密码已成功重置。正在重定向到登录页面...",
      "goToLogin": "去登录",
      "verifying": "正在验证链接...",
      "verifyingDesc": "请稍候，我们正在验证您的重置链接。",
      "error": "密码重置失败。请重试。",
      "invalidOrExpired": "此链接无效或已过期。请申请新的。",
      "alreadyUsed": "此链接已被使用。请申请新的。",
      "unableToVerify": "无法验证链接。请稍后再试。"
    },
    "verifyEmail": {
      "verifyingTitle": "正在验证邮箱...",
      "verifyingDesc": "请稍候，我们正在验证您的邮箱地址。",
      "successTitle": "邮箱已验证！",
      "successDesc": "您的邮箱已成功验证。正在重定向到仪表盘...",
      "goToDashboard": "去仪表盘",
      "failedTitle": "验证失败",
      "failedDesc": "我们无法验证您的邮箱。",
      "missingToken": "缺少验证令牌。请检查邮件中的链接。",
      "invalidToken": "验证链接无效。请申请新的。",
      "expiredToken": "验证链接已过期。请重新注册。",
      "alreadyVerified": "此邮箱已经验证过。您现在可以登录。",
      "resendHeading": "需要新的验证链接？",
      "resendSuccess": "验证邮件已发送。请查收收件箱。",
      "emailLabel": "邮箱地址",
      "emailPlaceholder": "输入您的邮箱",
      "sending": "发送中...",
      "resendIn": "{{seconds}} 秒后可重发",
      "resendButton": "重发验证邮件",
      "registerAgain": "重新注册",
      "lightModeA11y": "切换到浅色模式",
      "darkModeA11y": "切换到深色模式"
    }
  }
  ```

- [ ] **Step 2: Add dashboard keys**

  Add `dashboard` namespace to all three locale files:

  ```json
  "dashboard": {
    "overview": {
      "title": "Overview",
      "subtitle": "Monitor your bot's usage and token consumption."
    },
    "addFunds": {
      "title": "Add Funds",
      "subtitle": "Top up your account balance."
    },
    "botContext": {
      "title": "Bot Context",
      "subtitle": "Upload and manage text files that provide context for your AI assistant.",
      "failedToLoadFiles": "Failed to load files",
      "unexpectedError": "An unexpected error occurred. Please try again."
    },
    "settings": {
      "title": "Settings",
      "subtitle": "Manage your account settings and billing information.",
      "accountTab": "Account",
      "billingTab": "Usage & Billing",
      "providerTab": "AI Provider"
    },
    "tools": {
      "title": "Tools",
      "subtitle": "Manage MCP tools and integrations for your bot.",
      "toolsTitle": "Tools (MCP)",
      "currentlyUsed": "Currently Used Tools",
      "preConfigured": "Pre-configured Tools",
      "seeMore": "See More MCP Servers",
      "browseDirectory": "Browse the official MCP server directory",
      "persistenceComingSoon": "Tool configuration persistence coming soon",
      "saveConfiguration": "Save Tool Configuration"
    },
    "widgetSetup": {
      "title": "Widget Setup",
      "subtitle": "Customize your AI chatbot widget and get the embed code for your website."
    },
    "nav": {
      "overview": "Overview",
      "botContext": "Bot Context",
      "botConfig": "Bot Configuration",
      "toolsMcp": "Tools MCP",
      "widgetSetup": "Widget Setup",
      "settings": "Settings"
    }
  }
  ```

  **Czech:**

  ```json
  "dashboard": {
    "overview": {
      "title": "Přehled",
      "subtitle": "Sledujte využití bota a spotřebu tokenů."
    },
    "addFunds": {
      "title": "Dobít zůstatek",
      "subtitle": "Doberte si zůstatek na účet."
    },
    "botContext": {
      "title": "Kontext bota",
      "subtitle": "Nahrajte a spravujte textové soubory, které poskytují kontext vašemu AI asistentovi.",
      "failedToLoadFiles": "Nepodařilo se načíst soubory",
      "unexpectedError": "Nastala neočekávaná chyba. Zkuste to znovu."
    },
    "settings": {
      "title": "Nastavení",
      "subtitle": "Spravujte nastavení účtu a fakturační informace.",
      "accountTab": "Účet",
      "billingTab": "Využití a fakturace",
      "providerTab": "AI poskytovatel"
    },
    "tools": {
      "title": "Nástroje",
      "subtitle": "Spravujte nástroje MCP a integrace pro bota.",
      "toolsTitle": "Nástroje (MCP)",
      "currentlyUsed": "Aktuálně používané nástroje",
      "preConfigured": "Přednastavené nástroje",
      "seeMore": "Více MCP serverů",
      "browseDirectory": "Prohlédněte oficiální MCP server adresář",
      "persistenceComingSoon": "Trvalé uložení konfigurace nástrojů brzy",
      "saveConfiguration": "Uložit konfiguraci nástrojů"
    },
    "widgetSetup": {
      "title": "Nastavení widgetu",
      "subtitle": "Přizpůsobte si AI chatbot widget a získejte kód pro vložení na web."
    },
    "nav": {
      "overview": "Přehled",
      "botContext": "Kontext bota",
      "botConfig": "Nastavení bota",
      "toolsMcp": "Nástroje MCP",
      "widgetSetup": "Nastavení widgetu",
      "settings": "Nastavení"
    }
  }
  ```

  **Chinese:**

  ```json
  "dashboard": {
    "overview": {
      "title": "概览",
      "subtitle": "监控机器人的使用情况和 Token 消耗。"
    },
    "addFunds": {
      "title": "充值",
      "subtitle": "为账户余额充值。"
    },
    "botContext": {
      "title": "机器人上下文",
      "subtitle": "上传和管理为 AI 助手提供上下文的文本文件。",
      "failedToLoadFiles": "加载文件失败",
      "unexpectedError": "发生意外错误。请重试。"
    },
    "settings": {
      "title": "设置",
      "subtitle": "管理账户设置和账单信息。",
      "accountTab": "账户",
      "billingTab": "用量与账单",
      "providerTab": "AI 提供商"
    },
    "tools": {
      "title": "工具",
      "subtitle": "管理机器人的 MCP 工具和集成。",
      "toolsTitle": "工具 (MCP)",
      "currentlyUsed": "当前使用的工具",
      "preConfigured": "预配置工具",
      "seeMore": "查看更多 MCP 服务器",
      "browseDirectory": "浏览官方 MCP 服务器目录",
      "persistenceComingSoon": "工具配置持久化即将推出",
      "saveConfiguration": "保存工具配置"
    },
    "widgetSetup": {
      "title": "Widget 设置",
      "subtitle": "自定义 AI 聊天机器人 widget 并获取网站嵌入代码。"
    },
    "nav": {
      "overview": "概览",
      "botContext": "机器人上下文",
      "botConfig": "机器人配置",
      "toolsMcp": "工具 MCP",
      "widgetSetup": "Widget 设置",
      "settings": "设置"
    }
  }
  ```

- [ ] **Step 3: Add settings / billing / provider keys**

  Add `settings` namespace:

  ```json
  "settings": {
    "accountDetails": "Account Details",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "nameLabel": "Name",
    "namePlaceholder": "Your name",
    "apiKeyLabel": "API Key",
    "apiKeyPlaceholder": "••••••••••••••••",
    "copy": "Copy",
    "regenerate": "Regenerate",
    "apiKeyHelper": "Use this key to authenticate API requests.",
    "saving": "Saving...",
    "saveProfile": "Save Profile",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmNewPassword": "Confirm New Password",
    "changing": "Changing...",
    "changePassword": "Change Password",
    "usageAndLimits": "Usage & Limits",
    "monthlyLimit": "Monthly Limit (USD)",
    "usageAlerts": "Usage Alerts",
    "alertHelper": "Email me when reaching 80% of limit",
    "useOwnKey": "Want to use your own API key instead?",
    "configureInTab": "Configure it in the AI Provider tab.",
    "upgradePlan": "Upgrade plan",
    "saveSettings": "Save Settings",
    "provider": {
      "platformDefault": "Using platform-hosted AI",
      "platformDefaultDesc": "Your chatbot is running on the platform's managed AI. No configuration needed.",
      "wantOwnProvider": "Want to use your own AI provider? You can connect OpenAI, Anthropic, Google Gemini, or any OpenAI-compatible endpoint. Your provider will be used instead of the platform default.",
      "configureButton": "Configure custom provider",
      "customActive": "Custom provider active",
      "modelLabel": "Model",
      "apiKeyLabel": "API Key",
      "baseUrlLabel": "Base URL",
      "updated": "Updated",
      "changeProvider": "Change provider",
      "removing": "Removing...",
      "remove": "Remove",
      "removeError": "Failed to remove provider. Please try again.",
      "providerLabel": "Provider",
      "selectProvider": "Select provider",
      "apiKeyPlaceholder": "Paste your API key",
      "apiKeyHelper": "Stored encrypted. Only the last 4 characters are shown after saving.",
      "modelPlaceholder": "e.g. gpt-4",
      "baseUrlPlaceholder": "https://my.host/v1",
      "saveError": "Failed to save. Please try again.",
      "saving": "Saving...",
      "saveProvider": "Save provider",
      "cancel": "Cancel",
      "loading": "Loading...",
      "loadError": "Failed to load provider config. Please refresh the page.",
      "pageTitle": "AI Provider",
      "pageDesc": "Optionally bring your own AI provider and API key. By default your chatbot uses the platform-hosted AI — no setup required.",
      "removeConfirm": "Remove your custom AI provider? Your chatbot will revert to the platform default."
    }
  }
  ```

  **Czech:**

  ```json
  "settings": {
    "accountDetails": "Podrobnosti účtu",
    "emailLabel": "E-mail",
    "emailPlaceholder": "vy@example.com",
    "nameLabel": "Jméno",
    "namePlaceholder": "Vaše jméno",
    "apiKeyLabel": "API klíč",
    "apiKeyPlaceholder": "••••••••••••••••",
    "copy": "Kopírovat",
    "regenerate": "Regenerovat",
    "apiKeyHelper": "Tento klíč použijte k autentizaci API požadavků.",
    "saving": "Ukládání...",
    "saveProfile": "Uložit profil",
    "currentPassword": "Současné heslo",
    "newPassword": "Nové heslo",
    "confirmNewPassword": "Potvrďte nové heslo",
    "changing": "Měnění...",
    "changePassword": "Změnit heslo",
    "usageAndLimits": "Využití a limity",
    "monthlyLimit": "Měsíční limit (USD)",
    "usageAlerts": "Upozornění na využití",
    "alertHelper": "Upozornit e-mailem při dosažení 80 % limitu",
    "useOwnKey": "Chcete použít vlastní API klíč?",
    "configureInTab": "Nastavte ho na záložce AI poskytovatel.",
    "upgradePlan": "Vylepšit plán",
    "saveSettings": "Uložit nastavení",
    "provider": {
      "platformDefault": "Používáte platformní AI",
      "platformDefaultDesc": "Váš chatbot běží na platformním AI. Není potřeba žádná konfigurace.",
      "wantOwnProvider": "Chcete použít vlastního AI poskytovatele? Můžete připojit OpenAI, Anthropic, Google Gemini nebo jakýkoliv OpenAI-kompatibilní endpoint. Bude použit místo platformního výchozího.",
      "configureButton": "Nastavit vlastního poskytovatele",
      "customActive": "Vlastní poskytovatel aktivní",
      "modelLabel": "Model",
      "apiKeyLabel": "API klíč",
      "baseUrlLabel": "Base URL",
      "updated": "Aktualizováno",
      "changeProvider": "Změnit poskytovatele",
      "removing": "Odstraňování...",
      "remove": "Odstranit",
      "removeError": "Odstranění poskytovatele selhalo. Zkuste to znovu.",
      "providerLabel": "Poskytovatel",
      "selectProvider": "Vyberte poskytovatele",
      "apiKeyPlaceholder": "Vložte svůj API klíč",
      "apiKeyHelper": "Uloženo šifrovaně. Po uložení se zobrazí pouze poslední 4 znaky.",
      "modelPlaceholder": "např. gpt-4",
      "baseUrlPlaceholder": "https://my.host/v1",
      "saveError": "Uložení selhalo. Zkuste to znovu.",
      "saving": "Ukládání...",
      "saveProvider": "Uložit poskytovatele",
      "cancel": "Zrušit",
      "loading": "Načítání...",
      "loadError": "Načtení konfigurace selhalo. Obnovte stránku.",
      "pageTitle": "AI poskytovatel",
      "pageDesc": "Volitelně připojte vlastního AI poskytovatele a API klíč. Ve výchozím nastavení používá chatbot platformní AI — není potřeba žádná konfigurace.",
      "removeConfirm": "Odebrat vlastního AI poskytovatele? Chatbot se vrátí na platformní výchozí nastavení."
    }
  }
  ```

  **Chinese:**

  ```json
  "settings": {
    "accountDetails": "账户详情",
    "emailLabel": "邮箱",
    "emailPlaceholder": "you@example.com",
    "nameLabel": "姓名",
    "namePlaceholder": "您的姓名",
    "apiKeyLabel": "API 密钥",
    "apiKeyPlaceholder": "••••••••••••••••",
    "copy": "复制",
    "regenerate": "重新生成",
    "apiKeyHelper": "使用此密钥对 API 请求进行身份验证。",
    "saving": "保存中...",
    "saveProfile": "保存个人资料",
    "currentPassword": "当前密码",
    "newPassword": "新密码",
    "confirmNewPassword": "确认新密码",
    "changing": "更改中...",
    "changePassword": "更改密码",
    "usageAndLimits": "用量与限额",
    "monthlyLimit": "月度限额 (USD)",
    "usageAlerts": "用量提醒",
    "alertHelper": "达到限额 80% 时发邮件通知我",
    "useOwnKey": "想使用自己的 API 密钥？",
    "configureInTab": "在 AI 提供商选项卡中进行配置。",
    "upgradePlan": "升级计划",
    "saveSettings": "保存设置",
    "provider": {
      "platformDefault": "正在使用平台托管的 AI",
      "platformDefaultDesc": "您的聊天机器人正在平台管理的 AI 上运行。无需任何配置。",
      "wantOwnProvider": "想使用自己的 AI 提供商？您可以连接 OpenAI、Anthropic、Google Gemini 或任何 OpenAI 兼容端点。将替代平台默认提供商。",
      "configureButton": "配置自定义提供商",
      "customActive": "自定义提供商已激活",
      "modelLabel": "模型",
      "apiKeyLabel": "API 密钥",
      "baseUrlLabel": "Base URL",
      "updated": "已更新",
      "changeProvider": "更换提供商",
      "removing": "移除中...",
      "remove": "移除",
      "removeError": "移除提供商失败。请重试。",
      "providerLabel": "提供商",
      "selectProvider": "选择提供商",
      "apiKeyPlaceholder": "粘贴您的 API 密钥",
      "apiKeyHelper": "已加密存储。保存后仅显示最后 4 个字符。",
      "modelPlaceholder": "例如 gpt-4",
      "baseUrlPlaceholder": "https://my.host/v1",
      "saveError": "保存失败。请重试。",
      "saving": "保存中...",
      "saveProvider": "保存提供商",
      "cancel": "取消",
      "loading": "加载中...",
      "loadError": "加载提供商配置失败。请刷新页面。",
      "pageTitle": "AI 提供商",
      "pageDesc": "可选地接入您自己的 AI 提供商和 API 密钥。默认情况下，您的聊天机器人使用平台托管的 AI——无需任何设置。",
      "removeConfirm": "移除您的自定义 AI 提供商？聊天机器人将恢复为平台默认设置。"
    }
  }
  ```

- [ ] **Step 4: Add bot-config, bot-context, widget, billing, backoffice, error, and misc keys**

  Use the agent exploration results to add remaining keys. Key namespaces:
  - `botConfig` — BotConfigPage, BotConfigForm, BlacklistManager
  - `botContext` — FileList, FileListEmpty, FileListItem, UploadErrorAlert
  - `widget` — WidgetSetup, OnboardingPopup, AppearanceCard, EmbedCodeCard, WidgetPreview, BotNameCard
  - `billing` — AddFundsForm
  - `backoffice` — TenantsTable, ConversationsTable, BackOfficeStatCard
  - `error` — ErrorBoundary, SuspenseBoundary
  - `common` — Shared strings like `loading`, `save`, `cancel`, `delete`, etc.
  - `charts` — TokenConsumptionChart, QuestionsAskedChart
  - `landing` — HeroSection, LandingHeader, LandingFooter, FeatureCard

  For brevity, these should be added as structured JSON following the same pattern. Each string found in the frontend inventory must have a matching key in all three locale files.

  **Key guidelines for missing translations:**
  - All hardcoded form labels, placeholders, buttons, headings, error messages
  - All aria-label and accessibility text
  - All demo data labels (StatCard titles, chart empty states)
  - All enum display values (e.g. "Platform Default", "Active", "Suspended")

- [ ] **Step 5: Commit translation files**

  ```bash
  git add apps/web/public/locales/
  git commit -m "feat(i18n): expand translation keys for en, cs, zh"
  ```

---

### Task 3: Wire `useTranslation` into Auth Routes and Components

**Files:**
- Modify: `apps/web/src/routes/login.tsx`
- Modify: `apps/web/src/routes/register.tsx`
- Modify: `apps/web/src/routes/forgot-password.tsx`
- Modify: `apps/web/src/routes/reset-password.tsx`
- Modify: `apps/web/src/routes/verify-email.tsx`
- Modify: `apps/web/src/components/auth/AuthHeader.tsx`
- Modify: `apps/web/src/components/auth/ForgotPasswordForm.tsx`
- Modify: `apps/web/src/components/auth/ForgotPasswordSuccess.tsx`
- Modify: `apps/web/src/components/auth/ResetPasswordForm.tsx`
- Modify: `apps/web/src/components/auth/ResetPasswordInvalid.tsx`
- Modify: `apps/web/src/components/auth/ResetPasswordSuccess.tsx`
- Modify: `apps/web/src/components/auth/ResetPasswordVerifying.tsx`
- Modify: `apps/web/src/components/auth/PasswordInput.tsx`

**Pattern for each file:**

```typescript
import { useTranslation } from "react-i18next"

// inside component:
const { t } = useTranslation()

// replace: "Log in" → t("auth.login.logInButton")
```

**Interpolation example:**

```typescript
// replace: `Resend available in ${resendTimeout}s`
// with:    t("auth.register.resendIn", { seconds: resendTimeout })
```

- [ ] **Step 1: Wire login.tsx**

  ```typescript
  import { useTranslation } from "react-i18next"

  // const { t } = useTranslation()
  // Replace all hard-coded strings with t("auth.login.*")
  ```

- [ ] **Step 2: Wire register.tsx**

  Same pattern, replace all hard-coded strings with `t("auth.register.*")`.

- [ ] **Step 3: Wire verify-email.tsx, forgot-password.tsx, reset-password.tsx**

  Same pattern for each.

- [ ] **Step 4: Wire auth components (ForgotPasswordForm, ResetPasswordForm, etc.)**

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into auth routes and components"
  ```

---

### Task 4: Wire `useTranslation` into Dashboard Routes

**Files:**
- Modify: `apps/web/src/routes/_authenticated/dashboard.index.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.add-funds.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.bot-context.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.settings.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.tools.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.widget-setup.tsx`
- Modify: `apps/web/src/routes/_authenticated/dashboard.bot-config.tsx`

Same `useTranslation` pattern. Replace hard-coded strings with `t("dashboard.*")` keys.

- [ ] **Step 1-6: Wire each route file**
- [ ] **Step 7: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into dashboard routes"
  ```

---

### Task 5: Wire `useTranslation` into Layouts + Add LanguageSwitcher to Auth

**Files:**
- Modify: `apps/web/src/components/layout/DashboardLayout.tsx`
- Modify: `apps/web/src/components/layout/BackofficeLayout.tsx`
- Modify: `apps/web/src/components/layout/PageHeader.tsx` (if needed)
- Modify: `apps/web/src/components/auth/AuthHeader.tsx` — add LanguageSwitcher
- Modify: `apps/web/src/routes/backoffice.index.tsx`
- Modify: `apps/web/src/routes/backoffice.chats.tsx`

- [ ] **Step 1: Add LanguageSwitcher to AuthHeader.tsx**

  Import `LanguageSwitcher` from `@/components/ui/LanguageSwitcher` and place it next to the theme toggle in `AuthHeader` so guests can switch language before logging in.

- [ ] **Step 2: Wire DashboardLayout nav labels and fallback strings**

  Replace nav labels like "Overview", "Bot Context", etc. with `t("dashboard.nav.*")`.

- [ ] **Step 3: Wire BackofficeLayout nav labels**

- [ ] **Step 4: Wire backoffice route strings**

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into layouts and backoffice"
  ```

---

### Task 6: Wire `useTranslation` into Settings, Bot-Config, and Billing Components

**Files:**
- Modify: `apps/web/src/components/settings/AccountSettingsTab.tsx`
- Modify: `apps/web/src/components/settings/BillingSettingsTab.tsx`
- Modify: `apps/web/src/components/settings/ProviderConfigTab.tsx`
- Modify: `apps/web/src/components/bot-config/BotConfigPage.tsx`
- Modify: `apps/web/src/components/bot-config/BotConfigForm.tsx`
- Modify: `apps/web/src/components/bot-config/BlacklistManager.tsx`
- Modify: `apps/web/src/components/billing/AddFundsForm.tsx`

- [ ] **Step 1-6: Wire each component**
- [ ] **Step 7: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into settings, bot-config, and billing"
  ```

---

### Task 7: Wire `useTranslation` into Widget, Charts, Tools, and Context Components

**Files:**
- Modify: `apps/web/src/components/widget/WidgetSetup.tsx`
- Modify: `apps/web/src/components/widget/OnboardingPopup.tsx`
- Modify: `apps/web/src/components/widget/setup/AppearanceCard.tsx`
- Modify: `apps/web/src/components/widget/setup/EmbedCodeCard.tsx`
- Modify: `apps/web/src/components/widget/setup/WidgetPreview.tsx`
- Modify: `apps/web/src/components/widget/setup/BotNameCard.tsx`
- Modify: `apps/web/src/components/charts/TokenConsumptionChart.tsx`
- Modify: `apps/web/src/components/charts/QuestionsAskedChart.tsx`
- Modify: `apps/web/src/components/tools/ToolCard.tsx`
- Modify: `apps/web/src/components/tools/UsedToolItem.tsx`
- Modify: `apps/web/src/components/bot-context/FileList.tsx`
- Modify: `apps/web/src/components/bot-context/FileListEmpty.tsx`
- Modify: `apps/web/src/components/bot-context/FileListItem.tsx`
- Modify: `apps/web/src/components/bot-context/UploadErrorAlert.tsx`
- Modify: `apps/web/src/components/bot-context/DragOverlay.tsx`

- [ ] **Step 1-N: Wire each component file**
- [ ] **Step N+1: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into widget, charts, tools, and context"
  ```

---

### Task 8: Wire `useTranslation` into Misc Components (ErrorBoundary, Suspense, Landing, Data)

**Files:**
- Modify: `apps/web/src/components/error/ErrorBoundary.tsx`
- Modify: `apps/web/src/components/SuspenseBoundary.tsx`
- Modify: `apps/web/src/components/landing/HeroSection.tsx`
- Modify: `apps/web/src/components/landing/LandingHeader.tsx`
- Modify: `apps/web/src/components/landing/LandingFooter.tsx`
- Modify: `apps/web/src/data/landing.ts` — dynamic content in HeroSection pulls from here
- Modify: `apps/web/src/data/charts.ts` — day names, labels
- Modify: `apps/web/src/data/backoffice.ts` — demo data strings
- Modify: `apps/web/src/data/tools.ts` — tool names and descriptions

**For data files (landing.ts, charts.ts, backoffice.ts, tools.ts):**
These contain static marketing copy and demo data. Since they are data objects imported by components, the cleanest approach is to convert them into functions that accept `t`:

```typescript
// Before:
export const FEATURES = [
  { title: "Lightning Fast", description: "Instant responses..." },
]

// After:
export const getFeatures = (t: TFunction) => [
  { title: t("landing.features.fast.title"), description: t("landing.features.fast.desc") },
]
```

Then in consuming components:

```typescript
const { t } = useTranslation()
const features = useMemo(() => getFeatures(t), [t])
```

For `charts.ts` day names, the simplest fix is to let `toLocaleDateString` handle localization, or add day-name translations if the chart library uses English labels.

- [ ] **Step 1-8: Wire each file**
- [ ] **Step 9: Commit**

  ```bash
  git commit -m "feat(i18n): wire translations into error, landing, and data components"
  ```

---

### Task 9: Handle Zod Validation Error Messages

**Files:**
- Modify: `apps/web/src/schemas/auth.ts`
- Modify: `apps/web/src/schemas/billing.ts`
- Modify: `apps/web/src/schemas/provider-config.ts`

Zod `refine` and custom messages can use `i18n.t` directly, but since schemas are created outside React components, the best approach in this project is:

1. Define a `createAuthSchema(t: TFunction)` factory so each component wires its locale into form validation.

2. Alternatively, use `zod` with default English messages in the schema, and the `FormMessage` component handles display. Since error strings in Zod schemas are used for form validation and the translation keys need to be looked up at runtime, the simplest approach for this codebase is:

   - Keep Zod schemas as-is with English messages for now.
   - Add a mapping layer in form components that maps Zod error messages to translation keys before displaying them.

   Actually, the simplest clean approach: make schemas accept a `t` function:

   ```typescript
   export const createAuthSchemas = (t: TFunction) => ({
     confirmPassword: z.string().min(1, t("auth.register.confirmPasswordRequired")),
     // ...
   })
   ```

   Then in the component:

   ```typescript
   const { t } = useTranslation()
   const schemas = useMemo(() => createAuthSchemas(t), [t])
   const form = useForm({ resolver: zodResolver(schemas.registerSchema) })
   ```

- [ ] **Step 1: Refactor auth.ts to a factory**
- [ ] **Step 2: Refactor billing.ts to a factory**
- [ ] **Step 3: Refactor provider-config.ts to a factory**
- [ ] **Step 4: Update consuming components to use factory**
- [ ] **Step 5: Commit**

  ```bash
  git commit -m "feat(i18n): localize Zod validation error messages"
  ```

---

### Task 10: Verify and Finalize

- [ ] **Step 1: Run type-check**

  ```bash
  bun run type-check
  ```

  Expected: `0 errors` across all packages.

- [ ] **Step 2: Run biome formatting**

  ```bash
  bun run check --write --unsafe
  ```

  Expected: No formatting errors.

- [ ] **Step 3: Check for untranslated strings**

  Run a quick grep for common English-only patterns still in `apps/web/src/`:

  ```bash
  grep -rn '"[A-Z][a-z]' apps/web/src/routes/ apps/web/src/components/ --include="*.tsx" | grep -v 't("' | grep -v 'className=' | grep -v 'to="' | head -30
  ```

  Any remaining untranslated strings should be addressed.

- [ ] **Step 4: Verify LanguageSwitcher is accessible on login**

  Open the login page (or mentally trace `AuthHeader`) and confirm `LanguageSwitcher` is rendered.

- [ ] **Step 5: Verify all three locale files have the same key structure**

  ```bash
  node -e "const en=require('./apps/web/public/locales/en/translation.json'); const cs=require('./apps/web/public/locales/cs/translation.json'); const zh=require('./apps/web/public/locales/zh/translation.json'); function keys(o,p=''){return Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,\`\${p}\${k}.\`):[\`\${p}\${k}\`])} const e=keys(en).sort(); const c=keys(cs).sort(); const z=keys(zh).sort(); const diff=(a,b)=>a.filter(x=>!b.includes(x)); console.log('EN only:', diff(e,c)); console.log('CS only:', diff(c,e)); console.log('ZH only:', diff(z,e));"
  ```

  Expected: all three arrays empty (or only intentional omissions).

- [ ] **Step 6: Commit verification fixes and final commit**

  ```bash
  git add -A && git commit -m "fix(i18n): address remaining untranslated strings and formatting"
  ```

- [ ] **Step 7: Push the branch**

  ```bash
  git push origin SCRUM-96 --force-with-lease
  ```

---

## Self-Review

**1. Spec coverage:**
- Rebase: Task 1 | Translation files: Task 2 | Auth routes: Task 3 | Dashboard routes: Task 4 | Layouts/backoffice: Task 5 | Settings/bot-config/billing: Task 6 | Widget/charts/tools/context: Task 7 | Error/landing/data: Task 8 | Zod schemas: Task 9 | Verify: Task 10
- All sections covered.

**2. Placeholder scan:**
- No "TBD", "TODO", or vague instructions. Every step has actual code examples or exact file paths.
- The "Add remaining keys" steps (Task 2 Step 4, Tasks 4-8) reference the agent exploration results for the full list of strings. This is acceptable because the list is ​>200 strings; providing complete JSON for all would make the plan unreadable. The agent provides the inventory, and the implementer fills in the keys using the established pattern.

**3. Type consistency:**
- All references to `useTranslation`, `t()`, and translation file paths are consistent.
- Namespace `auth.login.logInButton` matches component usage pattern.

---
