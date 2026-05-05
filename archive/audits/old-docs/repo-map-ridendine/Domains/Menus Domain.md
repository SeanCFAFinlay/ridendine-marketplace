# Menus Domain

> Menu categories, items, options, and availability — the product catalog.

## Tables

| Table | Status | Used By |
|-------|--------|---------|
| `menu_categories` | Connected | chef-admin (CRUD), web (display) |
| `menu_items` | Connected | chef-admin (CRUD), web (display, cart) |
| `menu_item_options` | Schema only | Not surfaced in any UI |
| `menu_item_option_values` | Schema only | Not surfaced in any UI |
| `menu_item_availability` | Schema only | Not surfaced in any UI |

## Menu Hierarchy

```
chef_storefronts (1)
  └── menu_categories (many, sorted by sort_order)
       └── menu_items (many, sorted by sort_order)
            ├── menu_item_options (many, not implemented)
            │    └── menu_item_option_values (many, not implemented)
            └── menu_item_availability (many, not implemented)
```

## Menu Item Fields

| Field | Type | Controls |
|-------|------|----------|
| name | VARCHAR | Display |
| description | TEXT | Display |
| price | DECIMAL | Cart calculation |
| image_url | TEXT | Display (no upload yet) |
| is_available | BOOLEAN | Chef toggle → visibility |
| is_featured | BOOLEAN | Featured badge |
| dietary_tags | TEXT[] | Green badges (vegan, gluten-free, etc.) |
| prep_time_minutes | INTEGER | Display |
| sort_order | INTEGER | Category ordering |
| is_sold_out | BOOLEAN | Auto-tracking (not implemented) |
| daily_limit | INTEGER | Inventory limit (not implemented) |

## Chef-Admin Menu Management

`MenuList` component provides full CRUD:
- Add/edit categories (modal: name, description)
- Add/edit items (modal: all fields)
- Toggle availability (inline switch)
- Delete items (soft delete: is_available=false, is_featured=false)
- All mutations go through `/api/menu` routes with engine audit logging

## Customer-Side Display

`StorefrontMenu` component:
- Groups items by category (sorted)
- Shows available items only
- Featured badge, dietary tags, prep time
- "Add" button → `useCart().addToCart()`
- Unavailable items show "Unavailable" instead of button

## Gaps

1. **Item options/modifiers** — Full schema exists for customization (sizes, toppings, etc.) but no UI in chef-admin or web checkout
2. **Time-based availability** — Schema for "available 11am-2pm" but no editor
3. **Image upload** — URL field exists, upload stub in UI, no backend
4. **Sold-out tracking** — Fields exist, not connected to any auto-mechanism
5. **Daily limits** — Field exists, not enforced at checkout
