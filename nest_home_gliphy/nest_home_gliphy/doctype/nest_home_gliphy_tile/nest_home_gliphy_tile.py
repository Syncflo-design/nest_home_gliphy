import frappe
from frappe.model.document import Document


class NestHomeGliphyTile(Document):
    """A quick-launch tile on the landing page.

    Named from its label rather than a series. The series counter on an
    existing site can sit behind the tiles already inserted - the seeded ones
    are given explicit names without advancing it - and every later insert then
    dies on a duplicate primary key. A label-derived name has no counter to
    fall behind, and it reads properly in a link field.
    """

    def autoname(self):
        label = (self.label or "").strip()
        if not label:
            frappe.throw("A tile needs a label.")

        base = "NEST-TILE-" + frappe.scrub(label).upper()
        name = base
        suffix = 2
        while frappe.db.exists(self.doctype, name):
            name = "{0}-{1}".format(base, suffix)
            suffix += 1
        self.name = name
