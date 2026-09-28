// Make nest-home-gliphy the user's desk "home".
//
// The server sets frappe.boot.nest_home_gliphy_landing ONLY when a layout matches this
// user (and also sets it as boot.home_page). This script is the belt-and-braces
// layer: whenever the desk routes to its empty/home landing — initial load, a
// refresh, or the Home/house button — we send the user to nest-home-gliphy. Clicking a
// specific workspace or opening a record/list still works, because those routes
// are non-empty and are left alone.

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

	function redirect_if_home() {
		try {
			var t = target();
			if (!t) return;
			var r = frappe.get_route() || [];
			if (is_home_route(r) && (r[0] || "") !== t) {
				frappe.set_route(t);
			}
		} catch (e) {
			/* never break the desk */
		}
	}

	function bind_router() {
		if (frappe.router && frappe.router.on) {
			// Fires on every route change — catches the Home/house button.
			frappe.router.on("change", redirect_if_home);
			return true;
		}
		return false;
	}

	// Initial landing (router may already be settled by the time we run).
	$(document).on("app_ready", function () {
		redirect_if_home();
		bind_router();
	});
	// Safety nets for timing.
	setTimeout(function () { redirect_if_home(); bind_router(); }, 800);
	setTimeout(redirect_if_home, 2000);
})();
