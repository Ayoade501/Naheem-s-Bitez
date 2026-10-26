/* ==========================================================
   cart.js - add to cart, editable cart drawer, simulated test checkout
   For the Feane template (index.html, menu.html, about.html, book.html).
   Vanilla JS, no jQuery, no build step. It builds its own drawer and styles,
   so the only HTML change is one <script> tag per page.
   ========================================================== */
(() => {
    'use strict';

    /* ---------- Settings ---------- */
    const STORAGE_KEY = 'feaneCart';
    const MAX_QTY = 99;                  // sanity cap per cart line
    const MAX_PRICE_CENTS = 10000000;    // sanity cap: $100,000.00 per item
    const OPEN_DRAWER_ON_ADD = false;    // true = slide the cart open after every add
    const TOAST_MS = 1800;               // how long the "Product added successfully" message stays (milliseconds)

    /* ---------- State ---------- */
    // Prices are kept in integer cents, so 18.00 + 18.00 is always exactly 36.00.
    let cart = [];   // [{ name: string, priceCents: integer, qty: integer }]
    const el = {};   // DOM references, filled in by buildUI()
    let lastFocused = null;
    let paymentDone = false;   // true right after a successful test payment
    let toastTimer = null;     // remembers the countdown that hides the message

    const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const formatCents = (cents) => usd.format(cents / 100);

    /* ---------- Parsing helpers ---------- */
    const cleanName = (text) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);

    // "$1,234.50" -> 123450 (null when there is no usable number)
    function priceTextToCents(text) {
        const match = String(text || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        if (!match) return null;
        const cents = Math.round(Number(match[0]) * 100);
        return Number.isSafeInteger(cents) && cents >= 0 && cents <= MAX_PRICE_CENTS ? cents : null;
    }

    // What the customer typed in the payment box -> cents, or null if it is not a valid amount.
    function amountTextToCents(text) {
        const s = String(text || '').replace(/[$,\s]/g, '');
        if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(s)) return null;   // digits, optional .1 or .12
        return Math.round(Number(s) * 100);
    }

    /* ---------- Storage ---------- */

    // Never trust localStorage: validate every field and drop bad rows.
    function loadCart() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) return [];

            const merged = new Map();
            for (const row of data) {
                if (!row || typeof row !== 'object') continue;
                const name = cleanName(row.name);
                const { priceCents, qty } = row;
                if (!name) continue;
                if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > MAX_PRICE_CENTS) continue;
                if (!Number.isSafeInteger(qty) || qty < 1) continue;

                const key = name + '|' + priceCents;
                const existing = merged.get(key);
                if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
                else merged.set(key, { name, priceCents, qty: Math.min(MAX_QTY, qty) });
            }
            return [...merged.values()];
        } catch (err) {
            return [];   // corrupted JSON or storage blocked: start empty
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (err) {
            console.warn('cart.js: could not save the cart', err);
        }
    }

    /* ---------- Cart logic ---------- */

    // The menu has several products with the same name but different prices
    // (for example "Delicious Pizza" at $20, $17 and $10), so a line is
    // identified by name AND price. Same name + same price merges into one row.
    const findItem = (name, priceCents) => cart.find((i) => i.name === name && i.priceCents === priceCents);
    const totalCents = () => cart.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
    const totalQty = () => cart.reduce((sum, i) => sum + i.qty, 0);

    function commit() {
        saveCart();
        renderCart();
        // Any change to the cart makes an old payment message out of date.
        if (paymentDone) {
            el.panel.hidden = true;      // start a fresh checkout after a finished payment
            paymentDone = false;
        }
        clearStatus();
    }

    function addToCart(name, priceCents, qty) {
        const existing = findItem(name, priceCents);
        if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
        else cart.push({ name, priceCents, qty: Math.min(MAX_QTY, qty) });
        commit();
    }

    function changeQty(index, delta) {
        const item = cart[index];
        if (!item) return;
        const next = item.qty + delta;
        if (next < 1 || next > MAX_QTY) return;
        item.qty = next;
        commit();
    }

    function removeItem(index) {
        if (!cart[index]) return;
        cart.splice(index, 1);
        commit();
    }

    function clearCart() {
        cart = [];
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) { /* storage unavailable: nothing to clear */ }
        renderCart();
    }

    /* ---------- DOM helpers (DOM methods only, never innerHTML) ---------- */

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function actionButton(action, label, text, className, disabled) {
        const btn = make('button', className, text);
        btn.type = 'button';
        btn.dataset.action = action;
        btn.setAttribute('aria-label', label);
        btn.disabled = disabled;
        return btn;
    }

    /* ---------- Rendering ---------- */

    function buildRow(item, index) {
        const li = make('li', 'cart-item');
        li.dataset.index = String(index);

        const info = make('div', 'cart-item-info');
        info.append(make('strong', '', item.name), make('small', '', `${formatCents(item.priceCents)} each`));

        const controls = make('div', 'cart-item-controls');
        controls.append(
            actionButton('decrease', `Decrease quantity of ${item.name}`, '\u2212', 'cart-btn', item.qty <= 1),
            make('span', 'cart-qty', String(item.qty)),
            actionButton('increase', `Increase quantity of ${item.name}`, '+', 'cart-btn', item.qty >= MAX_QTY)
        );

        const line = make('span', 'cart-line-total', formatCents(item.priceCents * item.qty));
        const remove = actionButton('remove', `Remove ${item.name} from cart`, '\u00d7', 'cart-btn cart-remove', false);

        li.append(info, controls, line, remove);
        return li;
    }

    function renderCart() {
        const count = String(totalQty());   // sum of quantities, not number of rows
        const total = formatCents(totalCents());

        el.badges.forEach((badge) => { badge.textContent = count; });
        el.count.textContent = count;
        el.total.textContent = total;
        el.payTotal.textContent = total;

        el.list.replaceChildren();
        if (cart.length === 0) {
            el.list.append(make('li', 'cart-empty', 'Your cart is empty'));
            return;
        }
        cart.forEach((item, index) => el.list.append(buildRow(item, index)));
    }

    // After +/- re-renders a row, put keyboard focus back on the button that was used.
    function refocus(index, action) {
        const row = [...el.list.children].find((li) => li.dataset && li.dataset.index === String(index));
        const btn = row && row.querySelector(`button[data-action="${action}"]`);
        if (btn && !btn.disabled) btn.focus();
    }

    // Small message at the bottom of the screen that hides itself after TOAST_MS.
    // (A browser alert() cannot close itself; it always waits for the user to press OK.)
    function showToast(message) {
        el.toast.textContent = message;
        el.toast.classList.add('show');
        clearTimeout(toastTimer);                      // clicking again restarts the countdown
        toastTimer = setTimeout(() => el.toast.classList.remove('show'), TOAST_MS);
    }

    function bumpBadges() {
        el.badges.forEach((badge) => {
            badge.classList.remove('bump');
            void badge.offsetWidth;          // restart the CSS animation
            badge.classList.add('bump');
        });
    }

    /* ---------- Drawer (open / close / focus handling) ---------- */

    function openDrawer(opener) {
        lastFocused = opener || document.activeElement;
        document.body.classList.add('cart-open');
        el.drawer.setAttribute('aria-hidden', 'false');
        el.closeBtn.focus();
    }

    function closeDrawer() {
        document.body.classList.remove('cart-open');
        el.drawer.setAttribute('aria-hidden', 'true');
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    // Keep Tab inside the open drawer, and let Escape close it.
    function onDrawerKeydown(event) {
        if (event.key === 'Escape') {
            closeDrawer();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...el.drawer.querySelectorAll('button:not([disabled]), input, a[href]')]
            .filter((node) => node.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    /* ---------- Click handlers ---------- */

    // Delegated on document: one listener covers every product card on the page.
    function onDocumentClick(event) {
        // 1) The round cart-icon button on each food card
        const addBtn = event.target.closest('.food_section .box .options a');
        if (addBtn) {
            event.preventDefault();
            const box = addBtn.closest('.box');
            const nameEl = box && box.querySelector('.detail-box h5');
            const priceEl = box && box.querySelector('.options h6');

            const name = cleanName(nameEl && nameEl.textContent);
            const priceCents = priceTextToCents(priceEl && priceEl.textContent);
            if (!name || priceCents === null) {
                console.warn('cart.js: could not read the name or price for this product', box);
                return;
            }

            addToCart(name, priceCents, 1);   // these cards have no quantity box: each click adds 1
            bumpBadges();
            showToast(name + ' added to cart');
            if (OPEN_DRAWER_ON_ADD) openDrawer(addBtn);
            return;
        }

        // 2) The cart icon in the header opens the drawer
        const cartLink = event.target.closest('.cart_link');
        if (cartLink) {
            event.preventDefault();
            openDrawer(cartLink);
        }
    }

    function onListClick(event) {
        const btn = event.target.closest('button[data-action]');
        if (!btn || btn.disabled) return;
        const row = btn.closest('li[data-index]');
        if (!row) return;

        const index = Number(row.dataset.index);
        const action = btn.dataset.action;
        if (action === 'increase') changeQty(index, 1);
        else if (action === 'decrease') changeQty(index, -1);
        else if (action === 'remove') removeItem(index);

        if (action !== 'remove') refocus(index, action);
    }

    /* ---------- Simulated test checkout (no server, no real Paystack call) ---------- */

    // Shows a message inside the payment panel instead of using alert().
    // type is 'success' (green box) or 'error' (red box).
    function showStatus(message, type) {
        el.status.textContent = message;
        el.status.className = 'cart-status is-' + type;
    }

    function clearStatus() {
        el.status.textContent = '';
        el.status.className = 'cart-status';
    }

    function onCheckoutClick() {
        el.panel.hidden = false;
        renderCart();
        el.payAmount.focus();
    }

    function onPay() {
        if (cart.length === 0) {
            showStatus('Your cart is empty.', 'error');
            return;
        }

        const entered = amountTextToCents(el.payAmount.value);   // null if empty / not a valid amount

        if (entered !== null && entered === totalCents()) {
            clearCart();                                  // cart, localStorage, list, badges and total
            el.payAmount.value = '';
            showStatus('Payment successful', 'success');  // shown AFTER clearCart() so it is not wiped
            paymentDone = true;
        } else {
            showStatus('Payment unsuccessful', 'error');  // too much, too little, empty or non-numeric: cart is kept
        }
    }

    /* ---------- Build the cart UI ---------- */

    const STYLES = `
.cart_link{position:relative}
.cart-badge{position:absolute;top:-9px;right:-13px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ffbe33;color:#222831;font:700 11px/18px "Open Sans",sans-serif;text-align:center}
.cart-badge.bump{animation:cart-bump .35s ease}
@keyframes cart-bump{50%{transform:scale(1.4)}}
.cart-overlay{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(34,40,49,.6);opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;z-index:2000}
.cart-drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100%;display:flex;flex-direction:column;background:#fff;color:#222831;font-family:"Open Sans",sans-serif;box-shadow:-8px 0 30px rgba(0,0,0,.25);transform:translateX(100%);visibility:hidden;transition:transform .3s,visibility .3s;z-index:2001}
body.cart-open{overflow:hidden}
body.cart-open .cart-overlay{opacity:1;visibility:visible}
body.cart-open .cart-drawer{transform:none;visibility:visible}
.cart-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#222831;color:#fff}
.cart-header h2{margin:0;font-size:20px;color:#fff}
.cart-header h2 span{color:#ffbe33}
.cart-close{background:none;border:0;color:#fff;font-size:28px;line-height:1;cursor:pointer}
.cart-close:hover{color:#ffbe33}
.cart-body{flex:1;overflow-y:auto;padding:10px 20px}
.cart-list{list-style:none;margin:0;padding:0}
.cart-empty{padding:30px 0;text-align:center;color:#777}
.cart-item{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #eee}
.cart-item-info{flex:1;min-width:0;display:flex;flex-direction:column}
.cart-item-info small{color:#777}
.cart-item-controls{display:flex;align-items:center;gap:6px}
.cart-qty{min-width:24px;text-align:center;font-weight:700}
.cart-line-total{min-width:60px;text-align:right;font-weight:700}
.cart-btn{width:28px;height:28px;border:1px solid #ccc;border-radius:50%;background:#fff;color:#222831;font-size:16px;line-height:1;cursor:pointer}
.cart-btn:hover:not(:disabled){background:#ffbe33;border-color:#ffbe33}
.cart-btn:disabled{opacity:.4;cursor:not-allowed}
.cart-remove:hover:not(:disabled){background:#e5484d;border-color:#e5484d;color:#fff}
.cart-footer{padding:16px 20px;border-top:1px solid #eee}
.cart-total-row{display:flex;justify-content:space-between;margin-bottom:14px;font-size:18px}
.cart-checkout,.cart-pay{display:block;width:100%;padding:11px 20px;border:0;border-radius:45px;font-weight:700;cursor:pointer;transition:background-color .3s}
.cart-checkout{background:#ffbe33;color:#fff}
.cart-checkout:hover{background:#e69c00}
.cart-pay{margin-top:12px;background:#222831;color:#fff}
.cart-pay:hover{background:#000}
.cart-payment{margin-top:14px;padding:14px;border:1px solid #ddd;border-radius:10px}
.cart-payment[hidden]{display:none}
.cart-payment h3{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;font-size:16px}
.cart-test-badge{padding:2px 8px;border-radius:4px;background:#222831;color:#ffbe33;font-size:11px;letter-spacing:.5px}
.cart-note{margin:0 0 12px;font-size:12px;color:#777}
.cart-payment label{display:block;margin:10px 0 4px;font-size:13px}
.cart-payment input{width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:6px}
.cart-status{margin-top:12px;border-radius:6px;font-size:14px;font-weight:700}
.cart-status.is-success{padding:10px 12px;background:#e6f6ec;border:1px solid #b9e3c8;color:#15663a}
.cart-status.is-error{padding:10px 12px;background:#fdeceb;border:1px solid #f3c3c0;color:#a12622}
.cart-toast{position:fixed;left:50%;bottom:30px;transform:translate(-50%,20px);padding:15px 24px;border-radius:45px;border-left:5px solid #ffbe33;background: #ffbe33;color:black;font:600 14px "Open Sans",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,transform .25s,visibility .25s;z-index:3000}
.cart-toast.show{opacity:1;visibility:visible;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.cart-overlay,.cart-drawer,.cart-toast{transition:none}.cart-badge.bump{animation:none}}
`;

    function buildUI() {
        const style = make('style');
        style.id = 'cart-styles';
        style.textContent = STYLES;
        document.head.append(style);

        // Count badge on the header cart icon (every page has one)
        el.badges = [...document.querySelectorAll('.cart_link')].map((link) => {
            const badge = make('span', 'cart-badge', '0');
            badge.setAttribute('aria-hidden', 'true');
            link.setAttribute('aria-label', 'Open cart');
            link.append(badge);
            return badge;
        });

        el.overlay = make('div', 'cart-overlay');

        const drawer = make('aside', 'cart-drawer');
        drawer.id = 'cart-drawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-labelledby', 'cart-title');
        drawer.setAttribute('aria-hidden', 'true');

        // header
        const header = make('div', 'cart-header');
        const title = make('h2', '', 'Your cart ');
        title.id = 'cart-title';
        el.count = make('span', '', '0');
        title.append(el.count);
        el.closeBtn = make('button', 'cart-close', '\u00d7');
        el.closeBtn.type = 'button';
        el.closeBtn.setAttribute('aria-label', 'Close cart');
        header.append(title, el.closeBtn);

        // item list
        const body = make('div', 'cart-body');
        el.list = make('ul', 'cart-list');
        el.list.id = 'cart-items';
        body.append(el.list);

        // footer: total, checkout button, test payment panel
        const footer = make('div', 'cart-footer');
        const totalRow = make('div', 'cart-total-row');
        el.total = make('strong', '', '$0.00');
        totalRow.append(make('span', '', 'Total (USD)'), el.total);

        el.checkoutBtn = make('button', 'cart-checkout', 'Continue to checkout');
        el.checkoutBtn.type = 'button';

        el.panel = make('div', 'cart-payment');
        el.panel.hidden = true;
        const panelTitle = make('h3', '', 'Test checkout ');
        panelTitle.append(make('span', 'cart-test-badge', 'TEST MODE'));
        const note = make('p', 'cart-note',
            'This is a simulated test checkout, not a live Paystack charge. No money moves and no card details are collected.');
        const payTotalRow = make('div', 'cart-total-row');
        el.payTotal = make('strong', '', '$0.00');
        payTotalRow.append(make('span', '', 'Cart total'), el.payTotal);
        const label = make('label', '', 'Amount to pay (USD)');
        label.htmlFor = 'cart-pay-amount';
        el.payAmount = make('input');
        el.payAmount.id = 'cart-pay-amount';
        el.payAmount.type = 'text';
        el.payAmount.inputMode = 'decimal';
        el.payAmount.autocomplete = 'off';
        el.payAmount.placeholder = 'e.g. 20.00';
        el.payBtn = make('button', 'cart-pay', 'Pay');
        el.payBtn.type = 'button';
        // The message area that replaces alert(). role="status" makes screen readers read it out.
        el.status = make('div', 'cart-status');
        el.status.setAttribute('role', 'status');
        el.status.setAttribute('aria-live', 'polite');
        el.panel.append(panelTitle, note, payTotalRow, label, el.payAmount, el.payBtn, el.status);

        footer.append(totalRow, el.checkoutBtn, el.panel);
        drawer.append(header, body, footer);
        el.drawer = drawer;

        // The self-hiding "added" message. role="status" lets screen readers announce it.
        el.toast = make('div', 'cart-toast');
        el.toast.setAttribute('role', 'status');
        el.toast.setAttribute('aria-live', 'polite');

        document.body.append(el.overlay, drawer, el.toast);
    }

    /* ---------- Start-up ---------- */

    function init() {
        buildUI();
        cart = loadCart();
        renderCart();

        document.addEventListener('click', onDocumentClick);
        el.list.addEventListener('click', onListClick);
        el.closeBtn.addEventListener('click', closeDrawer);
        el.overlay.addEventListener('click', closeDrawer);
        el.drawer.addEventListener('keydown', onDrawerKeydown);
        el.checkoutBtn.addEventListener('click', onCheckoutClick);
        el.payBtn.addEventListener('click', onPay);
        el.payAmount.addEventListener('input', clearStatus);   // typing a new amount hides the old message
        el.payAmount.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                onPay();
            }
        });

        // Keep two open tabs in sync.
        window.addEventListener('storage', (event) => {
            if (event.key === STORAGE_KEY || event.key === null) {
                cart = loadCart();
                renderCart();
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();