// nest_home_gliphy — role-based, branded landing page (push, not pull).
// Built as a desk Page (not listview hooks) per CoWork_Helper gotchas
// 2026-05-11. Mounts inside page.body (jQuery in v16) per 2026-05-10.
// HTML is assembled as string arrays joined with "\n" (page-bundle rule).
//
// v0.3.0 "gliphy" layout: a solid ink header bar, then full-width bands —
// quick-launch tiles in three zones driven by each tile's Group field
// (Action / Reference below a rule / Also here at the bottom), then the
// attention lists across the rest. Every tile carries a blurb; rows are two
// lines: the party, what it is, and the due date.

frappe.pages['nest-home-gliphy'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Nest ERP',
		single_column: true
	});

	var BUILD_MARKER = 'v0.3.0-2026-09-28-phosphor-icons';
	console.log('Nest ERP home loaded:', BUILD_MARKER);

	// Load page styles from the separate CSS file (keeps this JS well under the
	// Cowork ~20KB Write/Edit truncation cap; CSS split from line one).
	if (!document.getElementById('nest-home-gliphy-stylesheet')) {
		var link = document.createElement('link');
		link.id = 'nest-home-gliphy-stylesheet';
		link.rel = 'stylesheet';
		link.href = '/assets/nest_home_gliphy/css/nest_home_gliphy.css';
		document.head.appendChild(link);
	}

	wrapper.nestHomeGliphy = window.nestHomeGliphy = new NestHomeGliphy(page, BUILD_MARKER);
};

frappe.pages['nest-home-gliphy'].on_page_show = function(wrapper) {
	if (wrapper.nestHomeGliphy) {
		wrapper.nestHomeGliphy.refresh();
		wrapper.nestHomeGliphy.collapse_sidebar();
	}
};

// ---------------------------------------------------------------------------

var NH_LIST_META = {
	A: { title: 'My Activities',      sub: 'Do these',     tint: 'nh-t-primary',
	     empty_title: "You're all clear", empty_msg: 'No activities need you right now.' },
	B: { title: 'Awaiting My Action', sub: 'Your call',    tint: 'nh-t-amber',
	     empty_title: 'Nothing awaiting you', empty_msg: 'No drafts are waiting on your decision.' },
	C: { title: 'Waiting On Others',  sub: 'Chase these',  tint: 'nh-t-teal',
	     empty_title: 'Nothing outstanding', empty_msg: "No one owes you anything right now." }
};

// Cycled across tiles that carry no colour of their own. Danger is deliberately
// absent: red on a launch tile reads as a warning about the tile.
var NH_TINTS = ['nh-t-primary', 'nh-t-teal', 'nh-t-amber'];

// Inline SVG rather than a font glyph: it takes its colour from the stylesheet
// and renders identically on every platform.
var NH_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
	+ ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
	+ ' aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>';

// The shipped icon set: Phosphor (fill weight, MIT), as SVG files under
// public/images/icons/. A tile's `icon` field naming one of these gets the
// glyph; swapping the file later re-skins every tile using it, with no code
// change and nothing to re-enter on the records.
var NH_ICONS = [
	'pos', 'transfer', 'invoice', 'customers', 'items', 'box', 'ledger',
	'report', 'count', 'supplier', 'guides', 'calendar', 'settings', 'launch'
];

var NH_ICON_PATH = '/assets/nest_home_gliphy/images/icons/';

// Returns a masked span for a known icon name, or '' if the name is not ours.
//
// A span painted through a CSS mask, not an <img>: the mask uses the file's
// shape only, so the glyph takes the tile's accent colour and works in both
// themes. An <img> cannot inherit currentColor and needed a filter hack to
// survive dark mode.
function nh_icon_img(key) {
	if (NH_ICONS.indexOf(key) < 0) return '';
	return '<span class="nh-ico" style="--ico:url(' + NH_ICON_PATH + key + '.svg)"></span>';
}

// An uploaded image (icon_image) wins; then a URL/path in `icon`; then one of
// the shipped default icons by name; then a Font Awesome / Octicon class;
// otherwise treat `icon` as plain text.
//
// The shipped set is checked before the legacy class handling so an existing
// tile can be switched to a real icon by changing one field.
function nh_tile_icon(t) {
	var esc = frappe.utils.escape_html;
	if (t.icon_image) return '<img src="' + esc(t.icon_image) + '" alt="">';
	var ic = t.icon;
	if (!ic) return nh_icon_img('launch');
	if (/^https?:|^\//.test(ic)) return '<img src="' + esc(ic) + '" alt="">';
	var shipped = nh_icon_img(String(ic).trim().toLowerCase());
	if (shipped) return shipped;
	if (/octicon|^fa /.test(ic)) return '<i class="' + esc(ic) + '"></i>';
	return esc(ic);
}

// Overdue marker. Colour alone is not a signal, so an overdue date carries a
// glyph as well as the danger colour.
var NH_OVERDUE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
	+ ' stroke-width="2.2" stroke-linecap="round" aria-hidden="true">'
	+ '<circle cx="12" cy="12" r="9"></circle>'
	+ '<path d="M12 8v5M12 16.5v.01"></path></svg>';

// Due-date rendering for a condensed row. Returns formatted text + overdue flag.
function nh_due(it) {
	if (!it || !it.date) return { text: '', over: false };
	var txt = it.date;
	try { txt = frappe.datetime.str_to_user(it.date); } catch (e) {}
	var over = false;
	try {
		var d = new Date(it.date);
		var today = new Date(); today.setHours(0, 0, 0, 0);
		over = d && !isNaN(d.getTime()) && d < today;
	} catch (e) {}
	return { text: txt, over: over };
}

// Comparator for two display strings; blanks sort last, case-insensitive.
function nh_cmp(x, y) {
	x = (x || '').toLowerCase(); y = (y || '').toLowerCase();
	if (!x && !y) return 0;
	if (!x) return 1;
	if (!y) return -1;
	return x < y ? -1 : (x > y ? 1 : 0);
}

// Returns a sort comparator for the given key (date|contact|company).
function nh_sorter(key) {
	if (key === 'contact') {
		return function(a, b) { return nh_cmp((a.meta || {}).contact, (b.meta || {}).contact); };
	}
	if (key === 'company') {
		return function(a, b) { return nh_cmp((a.meta || {}).company, (b.meta || {}).company); };
	}
	// default: due date ascending, undated rows last.
	return function(a, b) {
		var ad = a.date || '', bd = b.date || '';
		if (!ad && !bd) return 0;
		if (!ad) return 1;
		if (!bd) return -1;
		return ad < bd ? -1 : (ad > bd ? 1 : 0);
	};
}

class NestHomeGliphy {

	constructor(page, build) {
		this.page = page;
		this.build = build;
		this.allowed = ['A'];           // refined once context loads
		this.poll_handle = null;
		this.items = {};        // last-loaded items per category (client filter/sort)
		this.filter_text = {};  // active search text per category
		this.sort_key = {};     // active sort key per category

		// v16 modern desk: page.body is a jQuery object (NOT a DOM element).
		// Create our own container — never $(wrapper).find('.x'). See
		// gotchas/2026-05-10-frappe-v16-page-api-drift.md (Variant 2).
		this.$main = $('<div class="nest-home-gliphy-root"></div>').appendTo(page.body);

		this.setup_page_actions();
		this.render_shell();
		this.bind_events();
		this.start_clock();
		this.init();
		this.collapse_sidebar();
	}

	// Auto-hide the desk sidebar on arrival. Clicks Frappe's own toggle (so the
	// user can click it again to bring the sidebar back) and only ever collapses,
	// never force-expands. Runs every time the page is shown (on_page_show +
	// initial make). Selector list is defensive across v15/v16 desk markup.
	collapse_sidebar() {
		var tries = 0;
		var iv = setInterval(function() {
			tries++;
			var $toggle = $('.sidebar-toggle-btn, .collapse-sidebar, .sidebar-toggle')
				.filter(':visible').first();
			if ($toggle.length) {
				var $sb = $('.body-sidebar-container, .desk-sidebar').first();
				var collapsed = $('body').is('.sidebar-collapsed')
					|| $sb.is('.sidebar-collapsed, .collapsed');
				if (!collapsed) $toggle.get(0).click();
				clearInterval(iv);
			} else if (tries > 15) {
				clearInterval(iv);
			}
		}, 120);
	}

	setup_page_actions() {
		// Single header bar: hide the default desk page-head. Home + Refresh now
		// live in the branded header (see render_shell / bind_events).
		var $head = this.page.head ? $(this.page.head) : $(this.page.wrapper).find('.page-head');
		if ($head && $head.length) $head.hide();
	}

	render_shell() {
		var shell = [
			'<div class="nh-app">',
			'  <div class="nh-bar">',
			'    <div class="nh-bar-left">',
			'      <span id="nh-logo-slot"></span>',
			'      <div class="nh-bar-titles">',
			'        <div class="nh-title" id="nh-title">Nest ERP</div>',
			'        <div class="nh-greeting" id="nh-greeting"></div>',
			'      </div>',
			'    </div>',
			'    <div class="nh-bar-right">',
			'      <div class="nh-clockwrap">',
			'        <div class="nh-clock" id="nh-clock"></div>',
			'        <div class="nh-date" id="nh-date"></div>',
			'      </div>',
			'      <img class="nh-header-nest" id="nh-header-nest" src="/assets/nest_home_gliphy/images/nesterp_logo.svg" alt="NestERP" title="NestERP" style="display:none;">',
			'      <div class="nh-header-actions">',
			'        <button class="nh-hbtn" id="nh-home" title="Home" aria-label="Home"><i class="fa fa-home"></i></button>',
			'        <button class="nh-hbtn" id="nh-refresh" title="Refresh" aria-label="Refresh"><i class="fa fa-refresh"></i></button>',
			'      </div>',
			'    </div>',
			'  </div>',
			// Bands stacked full width: tiles first, then the attention lists.
			// v0.0.3 put buttons in a 50% left column; the bento grid needs the
			// whole width for the two-column "large" tiles to read as primary.
			'  <div id="nh-left" style="display:none;">',
			'    <div class="nh-band"><h2>Quick launch</h2><div class="nh-rule"></div><span class="nh-n" id="nh-tile-count"></span></div>',
			// Three zones. Actions are the things you DO; reference sits below a
			// rule because looking something up is not the same as doing it; the
			// "Also here" row is for what is not part of anybody's job - the
			// phone screens, the guides, and how to ask for help.
			'    <div class="nh-grid" id="nh-tiles"></div>',
			'    <div class="nh-grid nh-grid--ref" id="nh-tiles-ref" style="display:none;"></div>',
			'  </div>',
			'  <div id="nh-also" style="display:none;">',
			'    <div class="nh-band"><h2>Also here</h2><div class="nh-rule"></div></div>',
			'    <div class="nh-also-row" id="nh-tiles-also"></div>',
			'  </div>',
			'  <div class="nh-band"><h2>Needs your attention</h2><div class="nh-rule"></div></div>',
			'  <div class="nh-lists" id="nh-lists"></div>',
			'</div>'
		].join('\n');
		this.$main.html(shell);

		// Co-branding footer: subtle 'Powered by NestERP'. Hidden until the
		// landing context confirms the credit should show (white-label toggle).
		$('.nh-app', this.$main).append([
			'<div class="nh-footer" id="nh-footer" style="display:none;">',
			'  <span class="nh-powered">Powered by</span>',
			'  <img class="nh-nest-logo" src="/assets/nest_home_gliphy/images/nesterp_logo.svg" alt="NestERP">',
			'  <span class="nh-nest-name">NestERP</span>',
			'  <span class="nh-foot-sep" id="nh-foot-sep" style="display:none;">&middot;</span>',
			'  <a class="nh-support" id="nh-support" style="display:none;"></a>',
			'</div>'
		].join('\n'));
	}

	bind_events() {
		var me = this;
		// Attention item â†’ open its source via the normalised deep_link array.
		this.$main.on('click', '.nh-item', function() {
			var route = $(this).data('route');
			if (route) {
				try { route = JSON.parse(decodeURIComponent(route)); } catch (e) {}
				if (Array.isArray(route)) frappe.set_route.apply(frappe, route);
			}
		});
		// Rows are focusable, so Enter / Space must open them too — a keyboard
		// user should not have to reach for the mouse.
		this.$main.on('keydown', '.nh-item', function(e) {
			if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
				e.preventDefault();
				$(this).trigger('click');
			}
		});
		// Quick-launch tile â†’ navigate to its route.
		this.$main.on('click', '.nh-tile', function() {
			me.open_route($(this).data('route'), $(this).data('newtab'));
		});
		// Header controls.
		this.$main.on('click', '#nh-refresh', function() { me.refresh(); });
		this.$main.on('click', '#nh-home', function() { frappe.set_route('nest-home-gliphy'); });

		// List filter + sort (currently My Activities only) — client-side.
		this.$main.on('input', '.nh-filter', function() {
			var cat = (this.id || '').replace('nh-filter-', '');
			me.filter_text[cat] = this.value || '';
			me.apply_view(cat);
		});
		this.$main.on('change', '.nh-sort', function() {
			var cat = (this.id || '').replace('nh-sort-', '');
			me.sort_key[cat] = this.value || 'date';
			me.apply_view(cat);
		});
	}

	open_route(route, new_tab) {
		if (!route) return;
		route = String(route);
		// Website/portal routes are absolute paths outside the desk (not under /app);
		// open them as real page loads instead of pushing them through the desk router.
		if (route.charAt(0) === '/' && !/^\/app(\/|$|\?|#)/.test(route)) {
			if (new_tab) window.open(route, '_blank');
			else window.location.href = route;
			return;
		}
		if (new_tab || /^https?:/i.test(route)) {
			// For relative routes opened in new tab, build the full /app/ URL.
			var url = /^https?:/i.test(route) ? route
				: window.location.origin + '/app/' + route.replace(/^\/app\//, '').replace(/^\//, '');
			window.open(url, '_blank');
			return;
		}
		var r = route.replace(/^\/app\//, '').replace(/^\//, '');
		frappe.set_route(r ? r.split('/') : ['']);
	}

	// ---- lifecycle -------------------------------------------------------

	init() {
		var me = this;
		this.load_context().then(function() {
			me.build_list_sections();
			me.load_visible();      // List A paints first; B/C fill behind it.
			me.start_poll();
		});
	}

	// Load whatever lists this user is allowed to see, List A first so login
	// feels instant, then the rest behind it.
	load_visible() {
		if (!this.allowed || !this.allowed.length) return;
		if (this.allowed.indexOf('A') >= 0) this.load_category('A');
		var rest = this.allowed.filter(function(c) { return c !== 'A'; });
		if (rest.length) this.load_categories(rest);
	}

	load_context() {
		var me = this;
		return frappe.call({ method: 'nest_home_gliphy.api.get_landing_context' })
			.then(function(r) {
				var ctx = (r && r.message) || {};
				me.allowed = (ctx.allowed_lists && ctx.allowed_lists.length) ? ctx.allowed_lists : ['A'];
				me.render_header(ctx);
				me.render_tiles(ctx.tiles || []);
			})
			.catch(function() { me.allowed = ['A']; });
	}

	render_header(ctx) {
		var esc = frappe.utils.escape_html;
		$('#nh-title').text(ctx.app_title || 'Nest ERP');
		if (ctx.show_nest_credit !== false) {
			$('#nh-footer').show();
			$('#nh-header-nest').show();
		}
		if (ctx.support_link) {
			var sl = String(ctx.support_link).trim();
			var href = (/@/.test(sl) && !/:\/\//.test(sl)) ? ('mailto:' + sl) : sl;
			$('#nh-support').attr('href', href).text('Contact support');
			$('#nh-foot-sep').show();
			$('#nh-support').show();
		}
		var greet = ctx.greeting || ('Welcome back, ' + (ctx.user_fullname || '') + '.');
		$('#nh-greeting').text(greet);

		var $slot = $('#nh-logo-slot').empty();
		if (ctx.logo_url) {
			$slot.append($('<img class="nh-logo">').attr('src', ctx.logo_url).attr('alt', 'logo'));
		} else {
			var initial = (ctx.user_fullname || 'N').trim().charAt(0).toUpperCase();
			$slot.append('<span class="nh-logo-fallback">' + esc(initial) + '</span>');
		}
	}

	render_tiles(tiles) {
		// No buttons â†’ hide the whole quick-launch block so the lists take the
		// full width of the screen.
		if (!tiles || !tiles.length) { $('#nh-left').hide(); $('#nh-also').hide(); return; }

		// Three zones, split on the tile's own Group field.
		//   Action    - the things you DO, the main grid
		//   Reference - what you look up rather than do, below a rule
		//   Also here - not part of anybody's job: phone screens, guides, support
		var me = this;
		var zones = { 'Action': [], 'Reference': [], 'Also here': [] };
		tiles.forEach(function(t) {
			(zones[t.tile_group] || zones['Action']).push(t);
		});

		$('#nh-tiles').html(this.tiles_html(zones['Action']));
		$('#nh-tile-count').text(zones['Action'].length);

		var $ref = $('#nh-tiles-ref');
		if (zones['Reference'].length) {
			$ref.html(this.tiles_html(zones['Reference'], zones['Action'].length)).show();
		} else {
			$ref.empty().hide();
		}

		var $also = $('#nh-tiles-also');
		if (zones['Also here'].length) {
			$also.html(this.tiles_html(zones['Also here'], 0, true));
			$('#nh-also').show();
		} else {
			$also.empty();
			$('#nh-also').hide();
		}

		$('#nh-left').show();
		// If nest_help app is installed, auto-discover help badges for tiles.
		if (window.nestHelp) window.nestHelp.discover($('#nh-left'));
		return;
	}

	// Markup for one zone. `offset` keeps the tint cycle running across zones so
	// the reference row does not restart on the same colour the actions began on.
	// `small` is the "Also here" treatment: same card grammar, smaller, no rail.
	tiles_html(tiles, offset, small) {
		var esc = frappe.utils.escape_html;
		offset = offset || 0;
		return (tiles || []).map(function(t, i) {
			// An explicit colour on the record wins; otherwise cycle the semantic
			// tints so a grid never comes out one flat colour.
			var accent = t.color
				? (' style="--tint:' + esc(t.color) + ';--tint-soft:' + esc(t.color) + '1F;"')
				: '';
			var tint_cls = t.color ? '' : (' ' + NH_TINTS[(i + offset) % NH_TINTS.length]);
			var icon = nh_tile_icon(t);
			var icon_cls = t.icon_image ? 'nh-tile-icon nh-tile-icon-img' : 'nh-tile-icon';
			var help_slug = esc(t.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
			var blurb = (t.description && String(t.description).trim())
				? '    <div class="nh-tile-blurb">' + esc(t.description) + '</div>'
				: '';
			return [
				'<button type="button" class="nh-tile' + (small ? ' nh-tile--sm' : '') + tint_cls + '"' + accent + ' data-route="' + esc(t.route || '') + '"' + (t.open_in_new_tab ? ' data-newtab="1"' : '') + ' data-help="' + help_slug + '">',
				'  <span class="' + icon_cls + '">' + icon + '</span>',
				'  <span class="nh-tile-body">',
				'    <div class="nh-tile-label">' + esc(t.label || '') + '</div>',
				blurb,
				'  </span>',
				'  <span class="nh-chev">' + NH_CHEVRON + '</span>',
				'</button>'
			].join('\n');
		}).join('\n');
	}

	build_list_sections() {
		var html = this.allowed.map(function(cat) {
			var m = NH_LIST_META[cat];
			// My Activities (A) gets a filter + sort toolbar in its header.
			var tools = (cat === 'A') ? [
				'  <div class="nh-list-tools">',
				'    <input type="text" class="nh-filter" id="nh-filter-' + cat + '" placeholder="Filter by contact or company…" autocomplete="off">',
				'    <select class="nh-sort" id="nh-sort-' + cat + '" title="Sort">',
				'      <option value="date">Due date</option>',
				'      <option value="contact">Contact A-Z</option>',
				'      <option value="company">Company A-Z</option>',
				'    </select>',
				'  </div>'
			].join('\n') : '';
			return [
				'<section class="nh-list ' + m.tint + '" id="nh-list-' + cat + '" aria-label="' + m.title + '">',
				'  <div class="nh-list-head">',
				'    <div>',
				'      <div class="nh-list-title"><span class="nh-dot"></span>' + m.title + '</div>',
				'      <div class="nh-list-sub">' + m.sub + '</div>',
				'    </div>',
				'    <span class="nh-count nh-zero" id="nh-count-' + cat + '">0</span>',
				tools,
				'  </div>',
				'  <div class="nh-list-body" id="nh-body-' + cat + '">',
				'    <div class="nh-loading">Loading…</div>',
				'  </div>',
				'</section>'
			].join('\n');
		}).join('\n');
		$('#nh-lists').html(html);
	}

	// ---- data ------------------------------------------------------------

	load_category(cat) { return this.load_categories([cat]); }

	load_categories(cats) {
		var me = this;
		return frappe.call({
			method: 'nest_home_gliphy.api.get_attention',
			args: { categories: JSON.stringify(cats), limit_per: 200 }
		}).then(function(r) {
			var data = (r && r.message) || {};
			cats.forEach(function(cat) { me.render_list(cat, data[cat] || []); });
		}).catch(function() {
			cats.forEach(function(cat) {
				$('#nh-body-' + cat).html('<div class="nh-error">Could not load this list.</div>');
			});
		});
	}

	render_list(cat, items) {
		this.items[cat] = items || [];
		this.apply_view(cat);
	}

	// Render a category's stored items through its active filter + sort.
	// Filter matches contact OR company (case-insensitive substring); sort key
	// is date|contact|company. Cheap enough to re-run on every keystroke / poll.
	apply_view(cat) {
		var $body = $('#nh-body-' + cat);
		var $count = $('#nh-count-' + cat);
		var all = this.items[cat] || [];
		var q = (this.filter_text[cat] || '').trim().toLowerCase();

		var items = all;
		if (q) {
			items = all.filter(function(it) {
				var m = it.meta || {};
				var c = (m.contact || '').toLowerCase();
				var co = (m.company || '').toLowerCase();
				return c.indexOf(q) >= 0 || co.indexOf(q) >= 0;
			});
		}
		items = items.slice().sort(nh_sorter(this.sort_key[cat] || 'date'));

		$count.text(items.length).toggleClass('nh-zero', items.length === 0);

		if (!items.length) {
			if (q && all.length) {
				$body.html('<div class="nh-empty"><div class="nh-empty-title">No matches</div>'
					+ '<div class="nh-empty-msg">Nothing matches “'
					+ frappe.utils.escape_html(q) + '”.</div></div>');
			} else {
				$body.html(this.empty_state(cat));
			}
			return;
		}

		var me = this;
		$body.html(items.map(function(it) { return me.item_html(it); }).join('\n'));
	}

	// Two-line row: the party on top, what it is underneath, due date on the
	// right. Everything else (priority, amount, status) is one click away.
	item_html(it) {
		var esc = frappe.utils.escape_html;
		var route = encodeURIComponent(JSON.stringify(it.deep_link || []));
		var main = it.owner_or_party || it.title || '(untitled)';
		// The subtitle only earns its line when it says something the title
		// does not — otherwise the row reads as the same words twice.
		var sub = (it.subtitle && it.subtitle !== main) ? it.subtitle : '';
		var due = nh_due(it);
		var due_html = due.text
			? '<span class="nh-due' + (due.over ? ' nh-due-over' : '') + '">'
				+ (due.over ? NH_OVERDUE : '') + esc(due.text) + '</span>'
			: '<span class="nh-due nh-due-none">No date</span>';

		return [
			'<div class="nh-item" data-route="' + route + '" tabindex="0" title="' + esc(main) + '">',
			'  <div class="nh-item-main">',
			'    <div class="nh-item-title">' + esc(main) + '</div>',
			sub ? '    <div class="nh-item-sub">' + esc(sub) + '</div>' : '',
			'  </div>',
			'  <div class="nh-item-right">' + due_html + '</div>',
			'</div>'
		].join('\n');
	}

	empty_state(cat) {
		var m = NH_LIST_META[cat];
		return [
			'<div class="nh-empty">',
			'  <div class="nh-empty-check"><i class="fa fa-check"></i></div>',
			'  <div class="nh-empty-title">' + m.empty_title + '</div>',
			'  <div class="nh-empty-msg">' + m.empty_msg + '</div>',
			'</div>'
		].join('\n');
	}

	// ---- refresh + quiet poll -------------------------------------------

	refresh() {
		this.load_visible();
	}

	start_poll() {
		var me = this;
		if (this.poll_handle) return;
		// Quiet poll every 2 minutes, only when the tab is visible. v1 freshness
		// is load + manual refresh + this gentle poll; live socket push is phase 2.
		this.poll_handle = setInterval(function() {
			if (document.visibilityState === 'visible') me.refresh();
		}, 120000);
	}

	start_clock() {
		var $c = function() { return $('#nh-clock'); };
		var $d = function() { return $('#nh-date'); };
		function tick() {
			var now = new Date();
			var hh = String(now.getHours()).padStart(2, '0');
			var mm = String(now.getMinutes()).padStart(2, '0');
			$c().text(hh + ':' + mm);
			$d().text(now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
		}
		tick();
		setInterval(tick, 30000);
	}
}
