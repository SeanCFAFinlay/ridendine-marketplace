# Auth middleware by app

Factory: [packages/auth/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/packages/auth/src/middleware.ts)

Per-app configs: [apps/web/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/apps/web/src/middleware.ts), [apps/chef-admin/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/apps/chef-admin/src/middleware.ts), [apps/ops-admin/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/apps/ops-admin/src/middleware.ts), [apps/driver-app/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/apps/driver-app/src/middleware.ts).

```mermaid
flowchart LR
  subgraph factory [createAuthMiddleware]
    CM[shared_Supabase_SSR_cookies]
  end
  subgraph webM [web_selective_protect]
    W1["protected_/account"]
    W2["public_auth_routes"]
  end
  subgraph adminM [chef_driver_ops_default_protect]
    A1["all_routes_need_session"]
    A2["except_publicRoutes"]
  end
  CM --> webM
  CM --> adminM
```

**EXISTING:** Ops adds `publicRoutes` prefix `/api/engine/processors` in [apps/ops-admin/src/middleware.ts](file:///c:/Users/sean/RIDENDINEV1/apps/ops-admin/src/middleware.ts); handler-level token check in [apps/ops-admin/src/app/api/engine/processors/sla/route.ts](file:///c:/Users/sean/RIDENDINEV1/apps/ops-admin/src/app/api/engine/processors/sla/route.ts).
