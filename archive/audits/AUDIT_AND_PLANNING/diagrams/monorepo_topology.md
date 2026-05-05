# Monorepo topology

```mermaid
flowchart TB
  subgraph apps [Next_js_apps]
    web["web_3000_apps_web"]
    chef["chef_admin_3001_apps_chef_admin"]
    ops["ops_admin_3002_apps_ops_admin"]
    driver["driver_app_3003_apps_driver_app"]
  end
  subgraph packages [Workspace_packages]
    db["ridendine_db"]
    engine["ridendine_engine"]
    auth["ridendine_auth"]
    ui["ridendine_ui"]
    val["ridendine_validation"]
    types["ridendine_types"]
    utils["ridendine_utils"]
    notif["ridendine_notifications"]
    config["ridendine_config"]
  end
  subgraph data [Data_integrations]
    supa["Supabase_Postgres_RLS_Realtime"]
    stripe["Stripe"]
    resend["Resend_email"]
  end
  web --> db
  web --> engine
  web --> auth
  web --> ui
  chef --> db
  chef --> engine
  chef --> auth
  ops --> db
  ops --> engine
  ops --> auth
  driver --> db
  driver --> auth
  engine --> db
  engine --> notif
  db --> supa
  web --> stripe
```

Source inventory: [package.json](file:///c:/Users/sean/RIDENDINEV1/package.json), [CLAUDE.md](file:///c:/Users/sean/RIDENDINEV1/CLAUDE.md), [packages/engine/package.json](file:///c:/Users/sean/RIDENDINEV1/packages/engine/package.json).
