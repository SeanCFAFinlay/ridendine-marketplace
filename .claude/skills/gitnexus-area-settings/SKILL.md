---
name: gitnexus-area-settings
description: "Skill for the Settings area of ridendine-marketplace. 26 symbols across 7 files."
---

# Settings

26 symbols | 7 files | Cohesion: 84%

## When to Use

- Working with code in `apps/`
- Understanding how NotificationPreferences, loadPrefs, handleSave work
- Modifying settings-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/driver-app/src/components/settings/notification-preferences.tsx` | NotificationPreferences, loadPrefs, handleSave, toggle, buildDefaultPrefs (+1) |
| `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | NumberField, SectionHeading, SettingsForm, setBool, setNumber (+1) |
| `apps/chef-admin/src/components/settings/notification-preferences.tsx` | NotificationPreferences, toggle, buildDefaultPrefs, loadPrefs, handleSave (+1) |
| `apps/driver-app/src/app/settings/settings-client.tsx` | SettingsClient, saveToggle, SummaryCard, normalizeCurrency |
| `apps/chef-admin/src/app/dashboard/settings/page.tsx` | SettingsPage, getChefProfile |
| `apps/chef-admin/src/app/api/profile/route.ts` | GET |
| `packages/db/src/repositories/chef.repository.ts` | getChefByUserId |

## Entry Points

Start here when exploring this area:

- **`NotificationPreferences`** (Function) — `apps/driver-app/src/components/settings/notification-preferences.tsx:50`
- **`loadPrefs`** (Function) — `apps/driver-app/src/components/settings/notification-preferences.tsx:59`
- **`handleSave`** (Function) — `apps/driver-app/src/components/settings/notification-preferences.tsx:92`
- **`toggle`** (Function) — `apps/driver-app/src/components/settings/notification-preferences.tsx:84`
- **`SettingsForm`** (Function) — `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx:73`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `NotificationPreferences` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 50 |
| `loadPrefs` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 59 |
| `handleSave` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 92 |
| `toggle` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 84 |
| `SettingsForm` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 73 |
| `setBool` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 83 |
| `setNumber` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 79 |
| `GET` | Function | `apps/chef-admin/src/app/api/profile/route.ts` | 7 |
| `SettingsPage` | Function | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | 17 |
| `getChefByUserId` | Function | `packages/db/src/repositories/chef.repository.ts` | 32 |
| `NotificationPreferences` | Function | `apps/chef-admin/src/components/settings/notification-preferences.tsx` | 53 |
| `toggle` | Function | `apps/chef-admin/src/components/settings/notification-preferences.tsx` | 61 |
| `SettingsClient` | Function | `apps/driver-app/src/app/settings/settings-client.tsx` | 47 |
| `saveToggle` | Function | `apps/driver-app/src/app/settings/settings-client.tsx` | 61 |
| `handleSave` | Function | `apps/chef-admin/src/components/settings/notification-preferences.tsx` | 69 |
| `buildDefaultPrefs` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 27 |
| `mergePrefs` | Function | `apps/driver-app/src/components/settings/notification-preferences.tsx` | 35 |
| `NumberField` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 13 |
| `SectionHeading` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 65 |
| `ToggleField` | Function | `apps/ops-admin/src/app/dashboard/settings/settings-form.tsx` | 41 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SettingsClient → NumOrNull` | cross_community | 5 |
| `SettingsClient → PollOnce` | cross_community | 3 |
| `SettingsClient → FormatCurrency` | cross_community | 3 |
| `POST → FromMock` | cross_community | 3 |
| `POST → FromMock` | cross_community | 3 |
| `POST → From` | cross_community | 3 |
| `POST → From` | cross_community | 3 |

## How to Explore

1. `context({name: "NotificationPreferences"})` — see callers and callees
2. `query({search_query: "settings"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
