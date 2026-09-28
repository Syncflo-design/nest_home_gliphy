"""Stamp the shipped blurb and group onto tiles that predate those fields.

Why a patch rather than the seeder: `_ensure_tile` only fills a value that is
still blank, so an admin's own wording survives a deploy. That guard cannot
work for `tile_group`, because the field carries a default of "Action" — on an
existing record it is never blank, so Reference and Also here would never be
set. And `ensure_admin_layout` returns as soon as the layout exists, so the
fifteen workspace tiles never reached the seeder at all.

Runs once. Only touches tiles this app created (the NEST-TILE-WS- series) and
only those whose label is still one of ours, so a renamed or hand-made tile is
left alone.
"""

import frappe

from nest_home_gliphy.defaults import _ADMIN_TILES, _ALSO_HERE_TILES, _LIBRARY_TILES


def execute():
    if not frappe.db.exists("DocType", "Nest Home Gliphy Tile"):
        return

    shipped = {}
    for row in list(_ADMIN_TILES) + list(_LIBRARY_TILES):
        label, route, icon, color, blurb, group = row[:6]
        shipped[label] = (icon, blurb, group)
    for row in _ALSO_HERE_TILES:
        label, route, icon, color, blurb, group = row[:6]
        shipped[label] = (icon, blurb, group)

    names = frappe.get_all(
        "Nest Home Gliphy Tile",
        filters={"name": ("like", "NEST-TILE-WS-%")},
        fields=["name", "label", "description"],
    )

    for tile in names:
        spec = shipped.get(tile.label)
        if not spec:
            continue
        icon, blurb, group = spec
        # The group is ours to set: it is new, and the default masked it.
        frappe.db.set_value("Nest Home Gliphy Tile", tile.name, "tile_group", group)
        # The blurb is only filled where the admin has not written one.
        if blurb and not (tile.description or "").strip():
            frappe.db.set_value("Nest Home Gliphy Tile", tile.name, "description", blurb)
        # Move the Font Awesome classes we used to ship onto the icon set that
        # replaced them. An admin's own choice (an uploaded image, a URL, or a
        # name already in the set) is left as it is.
        current = frappe.db.get_value("Nest Home Gliphy Tile", tile.name, "icon") or ""
        if icon and current.startswith("fa "):
            frappe.db.set_value("Nest Home Gliphy Tile", tile.name, "icon", icon)

    frappe.db.commit()
