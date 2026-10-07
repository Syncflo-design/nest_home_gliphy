// Desk-wide behaviour of nest_home_gliphy, loaded on every desk page.
//
// 1. Make nest-home-gliphy the user's desk "home".
//    The server sets frappe.boot.nest_home_gliphy_landing ONLY when a layout matches this
//    user (and also sets it as boot.home_page). This script is the belt-and-braces
//    layer: whenever the desk routes to its empty/home landing — initial load, a
//    refresh, or a Home button — we send the user to nest-home-gliphy. Clicking a
//    specific workspace or opening a record/list still works, because those routes
//    are non-empty and are left alone.
//
// 2. A Home row at the top of the sidebar, above Search and Notification.
//    Frappe 16.50 dropped the top navbar and the home link it carried. That band of
//    standard rows is drawn once per sidebar by frappe.ui.Sidebar.add_standard_items and
//    is on every desk page (the dock beside it only shows for apps that opt in), so the
//    row is added there. No Gliphy layout for the user means no row.
//
// Shipped as a .bundle.js so the build fingerprints it: a plain /assets file kept being
// served from browser cache after a deploy.

frappe.provide("nest_home_gliphy");

(function () {
	function target() {
		return frappe.boot && frappe.boot.nest_home_gliphy_landing;
	}

	// Routes that mean "take me home". The empty route is the desk's own
	// landing; "home" is the Home workspace, which is what the sidebar's Home
	// entry and the house icon actually point at.
	function is_home_route(r) {
		if (!r || !r.length) return true;
		if (r.length === 1) {
			var first = (r[0] || "").toString().toLowerCase();
			return first === "" || first === "home" || first === "workspace";
		}
		// ["Workspaces", "Home"] on some v16 builds.
		if (r.length === 2 && (r[0] || "").toString().toLowerCase() === "workspaces") {
			return (r[1] || "").toString().toLowerCase() === "home";
		}
		return false;
	}

	// The desk route as it stands in the address bar: /desk/<route> (or /app/<route>).
	function path_route() {
		var p = (window.location.pathname || "").replace(/^\/(desk|app)(\/|$)/, "").replace(/\/+$/, "");
		return p ? p.split("/").map(decodeURIComponent) : [];
	}

	// from_router: called on a router change, when frappe.get_route() is settled.
	// Otherwise (first load), judge by the address bar: the router may not have
	// parsed it yet, and its empty route would wrongly read as "home", bouncing
	// every typed or linked deep link (e.g. /desk/project) to the landing page.
	function redirect_if_home(from_router) {
		try {
			var t = target();
			if (!t) return;
			var r = frappe.get_route() || [];
			var home = from_router === true
				? is_home_route(r)
				: is_home_route(path_route()) && (!r.length || is_home_route(r));
			if (home && (r[0] || "") !== t) {
				frappe.set_route(t);
			}
		} catch (e) {
			/* never break the desk */
		}
	}

	// --- Home row in the sidebar ----------------------------------------------------

	function add_home_row(sidebar) {
		var t = target();
		var $band = sidebar && sidebar.$standard_items_band;
		if (!t || !$band || !$band.length || $band.find(".nhg-sidebar-home").length) return;
		// A standard Button row, drawn by Frappe like Search and Notification.
		sidebar.add_item($band, {
			label: __("Home"),
			icon: "house",
			standard: true,
			type: "Button",
			class: "nhg-sidebar-home",
			onClick: function () {
				if (frappe.is_mobile()) sidebar.close();
				frappe.set_route(t);
			},
		});
		var row = sidebar.items[sidebar.items.length - 1];
		if (row && row.wrapper) row.wrapper.prependTo($band);
		// Names the row on the collapsed rail, as the other rows are.
		if (sidebar.label_rail_rows) sidebar.label_rail_rows();
	}

	function patch_sidebar() {
		var Sidebar = frappe.ui && frappe.ui.Sidebar;
		if (!Sidebar || !Sidebar.prototype.add_standard_items || Sidebar.prototype.nhg_home_patched) return;
		var add_standard_items = Sidebar.prototype.add_standard_items;
		Sidebar.prototype.add_standard_items = function () {
			var first = !this.standard_items_setup;
			var out = add_standard_items.apply(this, arguments);
			if (first) {
				try {
					add_home_row(this);
				} catch (e) {
					/* never break the desk */
				}
			}
			return out;
		};
		Sidebar.prototype.nhg_home_patched = true;
	}

	// A sidebar drawn before this script ran gets its row here.
	function ensure_home_row() {
		try {
			add_home_row(frappe.app && frappe.app.sidebar);
		} catch (e) {
			/* never break the desk */
		}
	}

	patch_sidebar();

	var bound = false;
	function bind_router() {
		if (bound) return true;
		if (frappe.router && frappe.router.on) {
			// Fires on every route change — catches the Home/house button.
			frappe.router.on("change", function () { redirect_if_home(true); });
			bound = true;
			return true;
		}
		return false;
	}

	// Initial landing (router may already be settled by the time we run).
	$(document).on("app_ready", function () {
		redirect_if_home();
		bind_router();
		ensure_home_row();
	});
	// Safety nets for timing.
	setTimeout(function () { redirect_if_home(); bind_router(); ensure_home_row(); }, 800);
	setTimeout(function () { redirect_if_home(); ensure_home_row(); }, 2000);
})();
