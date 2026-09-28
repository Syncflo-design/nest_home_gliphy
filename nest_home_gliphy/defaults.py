"""Default seed data for nest_home_gliphy.

ensure_admin_layout() ships the out-of-the-box experience: a System Manager
layout that mirrors the conventional desk's main workspaces as quick-launch
buttons, displayed in the nest_home_gliphy layout. Wired as after_install AND
after_migrate so a fresh deploy gives every admin a ready-made landing page.

Idempotent: it does nothing once the "Administrator" layout exists, so any admin
edits (or a deliberate delete-and-rebuild) are preserved across later deploys.
"""

import frappe

ADMIN_LAYOUT_NAME = "Administrator"

# Standard tile library. The admin layout uses the _ADMIN_TILES subset;
# the full library is available for any layout via build_profile_view.
#
# (label, route, icon, colour, blurb, group)
#
# `icon` names a file in public/images/icons/ where one exists; anything else
# falls back to the Font Awesome class it always was.
#
# `group` drives the three zones on the landing page:
#   Action    - the things you DO, the main grid
#   Reference - what you look up rather than do, below a rule
#   Also here - not part of anybody's job: phone screens, guides, support
_ADMIN_TILES = [
    ("Selling",           "selling",           "invoice",   "", "Quotations, orders and what they are worth",       "Action"),
    ("Buying",            "buying",            "supplier",  "", "Purchase orders and what is on its way in",        "Action"),
    ("Stock",             "stock",             "box",       "", "What you hold, where it is, and what moved",       "Action"),
    ("Invoicing",         "invoicing",         "invoice",   "", "Raise invoices and see what is owed",              "Action"),
    ("CRM",               "crm",               "customers", "", "Leads, opportunities and who to call next",        "Action"),
    ("Manufacturing",     "manufacturing",     "settings",  "", "Works orders, BOMs and what to make",              "Action"),
    ("Projects",          "projects",          "report",    "", "Jobs, tasks and what they have cost",              "Action"),
    ("Support",           "support",           "guides",    "", "Tickets raised by your customers",                 "Action"),

    ("Customers",         "customer",          "customers", "", "Who you sell to, and their terms",                 "Reference"),
    ("Financial Reports", "financial-reports", "ledger",    "", "Trial balance, P&L and balance sheet",             "Reference"),
    ("Insights",          "insights",          "ledger",    "", "Dashboards and your own reports",                  "Reference"),
    ("Assets",            "assets",            "box",       "", "What the business owns and what it is worth",      "Reference"),
    ("Users",             "user",              "customers", "", "Who can sign in, and what they may do",            "Reference"),
    ("Website",           "website",           "launch",    "", "Your public site and web pages",                   "Reference"),
    ("Settings",          "erpnext-settings",  "settings",  "", "Company, tax, naming and defaults",                "Reference"),
]

# Additional standard tiles available in the library for role-specific layouts.
# Created by ensure_standard_tiles() on install/migrate, never on the admin layout.
_LIBRARY_TILES = [
    ("Open POS",             "point-of-sale",              "pos",       "", "Open the till and take a sale",              "Action"),
    ("POS Closing",          "pos-closing-entry/new",      "count",     "", "Cash up and close the till for the day",     "Action"),
    ("Stock Transfer",       "stock-transfer/new",         "transfer",  "", "Move stock between warehouses",              "Action"),
    ("Stock Entry",          "stock-entry/new",            "transfer",  "", "Receive, issue or move stock",               "Action"),
    ("Stock Reconciliation", "stock-reconciliation/new",   "count",     "", "Correct quantities against a count",         "Action"),
    ("New Item",             "item/new",                   "items",     "", "Add something you buy, make or sell",        "Action"),
    ("Sales Invoices",       "sales-invoice",              "invoice",   "", "Invoices raised, and what is unpaid",        "Action"),
    ("New Sales Person",     "sales-person/new",           "customers", "", "Add someone to the sales team",              "Action"),

    ("Our Items",            "query-report/Stock Balance", "items",     "", "Everything you hold, with quantities",       "Reference"),
    ("Items",                "item",                       "items",     "", "The full item list and its detail",          "Reference"),
    ("Stock Balance",        "query-report/Stock Balance", "ledger",    "", "Quantity and value by item and warehouse",   "Reference"),
    ("Manufacturers",        "manufacturer",               "settings",  "", "Who makes the things you sell",              "Reference"),
    ("Item Attributes",      "item-attribute",             "items",     "", "Sizes, colours and the rest of the variants", "Reference"),
    ("Sales Persons",        "sales-person",               "customers", "", "The sales team and their territories",       "Reference"),
]

# The bottom row. Gated at seed time on whether the page actually exists, so a
# dead link never ships - a missing card reads as a feature this site does not
# have, which is the truth.
# (label, route, icon, colour, blurb, group, required_page)
_ALSO_HERE_TILES = [
    ("Mobile screens", "crm-mobile",    "pos",    "", "Scan, count and confirm on a phone or tablet", "Also here", "crm-mobile"),
    ("Guides",         "nest-help",     "guides", "", "How to do each of these, step by step",        "Also here", "nest-help"),
]


def _doctypes_ready():
    """Guard so this never explodes if called before the schema is synced."""
    try:
        return bool(
            frappe.db.exists("DocType", "Nest Home Gliphy Layout")
            and frappe.db.exists("DocType", "Nest Home Gliphy Tile")
        )
    except Exception:
        return False


def _ensure_tile(label, route, icon, color, sort_order, open_in_new_tab=0,
                 blurb="", group="Action"):
    """Return the name of the library button with this label, creating it if
    absent. Matching by label keeps re-runs from making duplicates.

    On an existing tile the blurb and group are filled in only when they are
    still blank, so an admin's own wording is never overwritten by a deploy."""
    name = frappe.db.get_value("Nest Home Gliphy Tile", {"label": label}, "name")
    if name:
        patch = {}
        if blurb and not frappe.db.get_value("Nest Home Gliphy Tile", name, "description"):
            patch["description"] = blurb
        if group and not frappe.db.get_value("Nest Home Gliphy Tile", name, "tile_group"):
            patch["tile_group"] = group
        for field, value in patch.items():
            frappe.db.set_value("Nest Home Gliphy Tile", name, field, value)
        return name
    doc = frappe.get_doc({
        "doctype": "Nest Home Gliphy Tile",
        "label": label,
        "enabled": 1,
        "icon": icon,
        "color": color,
        "route": route,
        "description": blurb,
        "tile_group": group,
        "sort_order": sort_order,
        "open_in_new_tab": open_in_new_tab,
    })
    # Use an explicit, deterministic name and bypass the naming series. The
    # fixture buttons (NEST-TILE-0001..) were imported with fixed names without
    # advancing the series counter, so a series-named insert would collide.
    doc.name = "NEST-TILE-WS-" + frappe.scrub(label).upper()
    doc.flags.name_set = True
    doc.insert(ignore_permissions=True)
    return doc.name


def ensure_admin_layout():
    """Create the default System Manager layout once. No-op if it exists."""
    try:
        if not _doctypes_ready():
            return
        if frappe.db.exists("Nest Home Gliphy Layout", ADMIN_LAYOUT_NAME):
            return

        tile_rows = []
        for i, (label, route, icon, color, blurb, group) in enumerate(_ADMIN_TILES):
            tile_rows.append({"tile": _ensure_tile(
                label, route, icon, color, i, blurb=blurb, group=group
            )})

        # The bottom row belongs on the default layout too, or the phone screens
        # and the guides exist in the library and appear nowhere. Still gated on
        # the page being installed, so a dead card never ships.
        for j, (label, route, icon, color, blurb, group, page) in enumerate(_ALSO_HERE_TILES):
            if page and not frappe.db.exists("Page", page):
                continue
            tile_rows.append({"tile": _ensure_tile(
                label, route, icon, color, 900 + j, blurb=blurb, group=group
            )})

        frappe.get_doc({
            "doctype": "Nest Home Gliphy Layout",
            "layout_name": ADMIN_LAYOUT_NAME,
            "enabled": 1,
            "applies_to": "Role",
            "role": "System Manager",
            "priority": 0,
            "show_list_a": 1,
            "show_list_b": 1,
            "show_list_c": 1,
            "greeting": "Here's what needs you today.",
            "tiles": tile_rows,
        }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "nest_home_gliphy.ensure_admin_layout")


def ensure_standard_tiles():
    """Create the library tiles that ship with nest_home_gliphy. Idempotent — matched
    by label, so re-runs never duplicate. Called from after_install / after_migrate
    alongside ensure_admin_layout."""
    try:
        if not _doctypes_ready():
            return
        for i, (label, route, icon, color, blurb, group) in enumerate(_LIBRARY_TILES):
            _ensure_tile(
                label, route, icon, color, i + len(_ADMIN_TILES),
                blurb=blurb, group=group,
            )

        # The bottom row, only where the page it points at is installed.
        for j, (label, route, icon, color, blurb, group, page) in enumerate(_ALSO_HERE_TILES):
            if page and not frappe.db.exists("Page", page):
                continue
            _ensure_tile(
                label, route, icon, color,
                900 + j, blurb=blurb, group=group,
            )
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "nest_home_gliphy.ensure_standard_tiles")


# ---------------------------------------------------------------------------
# Reusable: compile a Role Profile's view in one call
# ---------------------------------------------------------------------------
def _resolve_tile_spec(spec, sort_order=0):
    """Turn one tile spec into a shared-library Nest Home Gliphy Tile name.

    A spec is either:
      * str  -> an existing tile's *name* (e.g. "NEST-TILE-0007") or its *label*
                (e.g. "CRM"). Must already exist.
      * dict -> {"label", "route", "icon"?, "color"?, "sort_order"?}; the library
                tile is reused if one with that label exists, else created (matched
                by label, so re-runs never duplicate). "label" + "route" required.
    """
    if isinstance(spec, str):
        if frappe.db.exists("Nest Home Gliphy Tile", spec):
            return spec
        by_label = frappe.db.get_value("Nest Home Gliphy Tile", {"label": spec}, "name")
        if by_label:
            return by_label
        frappe.throw(
            "No Nest Home Gliphy Tile named or labelled '{0}'. Pass a dict with "
            "label + route to create it.".format(spec)
        )
    if isinstance(spec, dict):
        label = spec.get("label")
        route = spec.get("route")
        if not label or not route:
            frappe.throw("A tile dict needs at least 'label' and 'route'.")
        return _ensure_tile(
            label,
            route,
            spec.get("icon") or "octicon octicon-rocket",
            spec.get("color") or "",
            spec.get("sort_order", sort_order),
            spec.get("open_in_new_tab", 0),
        )
    frappe.throw("Each tile must be a string (name/label) or a dict.")


def ensure_layout_for_profile(
    role_profile,
    tiles,
    lists=("A", "B", "C"),
    greeting="Here's what needs you today.",
    priority=0,
    enabled=1,
    layout_name=None,
    replace_tiles=True,
):
    """Create or update the Nest Home Gliphy Layout for a Role Profile, in one call.

    This is the scripted path for "compile a view per Role Profile": point it at
    a role profile and the buttons you want; it ensures every shared-library tile
    exists (no duplicates) and wires them onto the layout in the given order.
    Idempotent — safe to call again to reshape an existing layout.

    role_profile : name of an existing Role Profile (the layout's match key).
    tiles        : ordered list of tile specs (see _resolve_tile_spec).
    lists        : subset of {"A","B","C"} the layout shows (default: all).
    greeting     : header greeting line.
    priority     : higher wins when a user matches more than one layout.
    enabled      : 0/1.
    layout_name  : document name to use (defaults to the role profile name).
    replace_tiles: True rewrites the tile rows to exactly `tiles`; False appends
                   only the missing ones to whatever the layout already has.

    Returns the layout document name.
    """
    if not _doctypes_ready():
        frappe.throw("nest_home_gliphy doctypes are not migrated yet.")
    if not role_profile:
        frappe.throw("role_profile is required.")

    # Resolve buttons to library tile names first (creating dict specs as needed).
    tile_names = [_resolve_tile_spec(spec, i) for i, spec in enumerate(tiles or [])]

    existing = frappe.db.get_value(
        "Nest Home Gliphy Layout",
        {"applies_to": "Role Profile", "role_profile": role_profile},
        "name",
    )
    if existing:
        doc = frappe.get_doc("Nest Home Gliphy Layout", existing)
    else:
        doc = frappe.new_doc("Nest Home Gliphy Layout")
        doc.layout_name = layout_name or role_profile

    doc.enabled = 1 if enabled else 0
    doc.applies_to = "Role Profile"
    doc.role_profile = role_profile
    doc.priority = priority
    doc.greeting = greeting
    lset = set(lists or ())
    doc.show_list_a = 1 if "A" in lset else 0
    doc.show_list_b = 1 if "B" in lset else 0
    doc.show_list_c = 1 if "C" in lset else 0

    if replace_tiles:
        doc.set("tiles", [])
    have = {row.tile for row in (doc.get("tiles") or [])}
    for name in tile_names:
        if name not in have:
            doc.append("tiles", {"tile": name})
            have.add(name)

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return doc.name
