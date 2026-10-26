# cart.js explained (plain English)

This file explains **everything** in `cart.js`: what each part does, what each command means, and which commands do the three things you asked about.

> Line numbers below are approximate. If you edit the file they will shift, so use **Ctrl+F** and search for the function name instead (for example `openDrawer`).

---

## Part 1: Quick answers to your questions

### Which command opens the cart?

Two steps, in two places:

1. **The click is detected** in the function `onDocumentClick` (around line 244). This is the part that notices you clicked the cart icon in the header:

   ```js
   const cartLink = event.target.closest('.cart_link');
   if (cartLink) {
       event.preventDefault();
       openDrawer(cartLink);
   }
   ```
   `.cart_link` is the class your template already puts on the cart icon in the header. If what you clicked is inside that icon, `openDrawer(...)` runs.

2. **The cart slides open** in the function `openDrawer` (around line 207). This is the command that actually opens it:

   ```js
   document.body.classList.add('cart-open');
   ```
   This adds the word `cart-open` to the `<body>` tag. The CSS inside `cart.js` (the `STYLES` block) says: "when the body has `cart-open`, slide the cart in from the right and show the dark background". Removing that word (in `closeDrawer`) closes the cart again.

So the cart is always on the page. It is just hidden off-screen until the body gets the word `cart-open`.

### Which command makes the selected item appear in the cart?

A chain of four steps, all starting when you click the round cart button on a food card:

1. **`onDocumentClick`** (around line 244) detects the click on a food card's cart button:
   ```js
   const addBtn = event.target.closest('.food_section .box .options a');
   ```
2. It reads the **name** and **price** from that same card:
   ```js
   const nameEl  = box.querySelector('.detail-box h5');   // e.g. "Delicious Pizza"
   const priceEl = box.querySelector('.options h6');      // e.g. "$20"
   ```
3. **This is the command that puts the item in the cart** (around line 260):
   ```js
   addToCart(name, priceCents, 1);
   ```
   Inside `addToCart` (around line 102), the line `cart.push({ name, priceCents, qty })` adds a new item to the cart list. If the same item (same name **and** same price) is already there, it adds 1 to its quantity instead.
4. **`commit()`** then saves the cart to the browser's memory and calls **`renderCart()`**, which redraws the list in the cart drawer, and updates the number on the header badge and the total.

### Which command makes an item go from 1 to more than 1 (and back)?

The `+` and `−` buttons in each cart row:

1. **`buildRow`** (around line 152) creates each row. It creates a `−` button, the quantity number, and a `+` button. Each button carries a label in `data-action`: `"decrease"` or `"increase"`.
2. **`onListClick`** (around line 274) detects a click on one of those buttons and reads its label:
   ```js
   if (action === 'increase') changeQty(index, 1);
   else if (action === 'decrease') changeQty(index, -1);
   ```
3. **`changeQty`** (around line 109) changes the number:
   ```js
   const next = item.qty + delta;      // delta is +1 or -1
   if (next < 1 || next > MAX_QTY) return;   // never below 1 or above 99
   item.qty = next;
   commit();
   ```

### How does the price go up and down with the quantity?

Prices are never typed in by hand. They are **recalculated every time** the cart is redrawn:

- **Row total:** in `buildRow`, `item.priceCents * item.qty` (unit price times quantity).
- **Grand total:** in `totalCents` (line 88), which adds up `priceCents * qty` for every row.

Because `commit()` calls `renderCart()` after every change, changing the quantity automatically refreshes both numbers.

---

## Part 2: Words you will see in the code

| Term | What it means |
|---|---|
| `const` | A variable that cannot be re-assigned. |
| `let` | A variable that can be changed later. |
| `function name() { }` | A named block of code you can run by writing `name()`. |
| `(x) => x * 2` | An **arrow function**, a short way to write a function. |
| `(() => { ... })();` | A function that runs immediately. It wraps the whole file so nothing leaks into the page's global space and clashes with your other scripts. |
| `'use strict';` | Turns on stricter JavaScript, so silly mistakes cause errors instead of silently doing the wrong thing. |
| `` `Hello ${name}` `` | A **template literal**. Text with variables inserted using `${ }`. |
| `{ name, priceCents }` | An **object** (a labelled bundle of values). |
| `const { priceCents, qty } = row;` | **Destructuring**: pull `priceCents` and `qty` out of `row` in one line. |
| `[...x]` | **Spread**: copy the items of `x` into a new list. |
| `&&` / `\|\|` | "and" / "or". `a && b` gives `b` only if `a` is truthy; `a \|\| b` gives `a` if truthy, otherwise `b`. |
| `null` | "no value". |
| `try { } catch (err) { }` | Try the code; if it crashes, run the `catch` part instead of breaking the page. |
| `event` | The information the browser gives you about a click or key press. |
| `event.target` | The exact thing that was clicked. |
| `.closest('selector')` | Starts at that element and walks **up** the page until it finds a parent matching the selector. If none, gives `null`. |
| `.querySelector('selector')` | Searches **inside** an element for the first match. |
| `event.preventDefault()` | Stops the browser's normal behaviour (for example, a link jumping to another page). |
| `dataset` | Reads/writes `data-something="..."` attributes. `btn.dataset.action = 'remove'` creates `data-action="remove"`. |
| `classList.add/remove` | Adds or removes a CSS class name on an element. |
| `textContent` | Sets an element's text as **plain text** (safe: never treated as HTML). |
| `innerHTML` | Sets text **as HTML**. Not used in this file on purpose, because it can allow XSS attacks. |
| `localStorage` | The browser's small memory that survives refreshes and closing the tab. |
| `JSON.stringify / JSON.parse` | Turn a list/object into text (to store it) and back again. |
| Regular expression `/\d+/` | A pattern for matching text. `\d` means a digit. |

Array (list) commands used:

| Command | What it does |
|---|---|
| `array.push(x)` | Adds `x` to the end. |
| `array.splice(i, 1)` | Removes 1 item at position `i`. |
| `array.find(fn)` | Returns the first item where `fn` is true. |
| `array.reduce(fn, 0)` | Combines all items into one value (used to add up totals). |
| `array.forEach(fn)` | Runs `fn` once for each item. |
| `array.map(fn)` | Makes a new list by transforming each item. |
| `array.filter(fn)` | Makes a new list keeping only items where `fn` is true. |
| `Array.isArray(x)` | Checks that `x` really is a list. |

---

## Part 3: The file, section by section

### Settings (lines ~10 to 14)

```js
const STORAGE_KEY = 'feaneCart';
const MAX_QTY = 99;
const MAX_PRICE_CENTS = 10000000;
const OPEN_DRAWER_ON_ADD = false;
```
- `STORAGE_KEY`: the name under which the cart is saved in the browser.
- `MAX_QTY`: the most of one item allowed (99).
- `MAX_PRICE_CENTS`: a safety limit on any single price: 10,000,000 cents = $100,000.00.
- `OPEN_DRAWER_ON_ADD`: change `false` to `true` if you want the cart to slide open every time an item is added.

### State (lines ~16 to 24)

```js
let cart = [];
const el = {};
let lastFocused = null;
let paymentDone = false;
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatCents = (cents) => usd.format(cents / 100);
```
- `cart`: the actual list of items. Each item looks like `{ name: 'Delicious Pizza', priceCents: 2000, qty: 2 }`.
- **Why cents?** Computers make tiny mistakes with decimals (`0.1 + 0.2` gives `0.30000000000000004`). Storing money as whole cents (`$18.00` is `1800`) avoids it completely.
- `el`: a box that remembers the page elements the script created (the list, the total, the badges, etc.).
- `lastFocused`: remembers what you clicked, so focus goes back there when the cart closes (important for keyboard users).
- `paymentDone`: becomes `true` right after a successful test payment.
- `usd` / `formatCents`: turn `2000` into the text `$20.00`.

### Parsing helpers (lines ~26 to 42)

**`cleanName(text)`**: tidies a name. `String(text || '')` makes sure it is text; `.replace(/\s+/g, ' ')` turns any run of spaces/line breaks into one space; `.trim()` removes spaces at both ends; `.slice(0, 120)` cuts it at 120 characters.

**`priceTextToCents(text)`**: turns `"$1,234.50"` into `123450`.
- `.replace(/,/g, '')` removes commas.
- `.match(/\d+(?:\.\d+)?/)` finds the first number (digits, optionally a dot and more digits).
- `Math.round(Number(match[0]) * 100)` multiplies by 100 and rounds to a whole number.
- The final line returns `null` if the result is not a sensible whole number between 0 and the maximum.

**`amountTextToCents(text)`**: does the same for the amount typed in the payment box.
- `.replace(/[$,\s]/g, '')` removes `$`, commas and spaces.
- `/^\d{1,9}(?:\.\d{1,2})?$/` accepts only: 1 to 9 digits, optionally followed by a dot and 1 or 2 digits. `abc`, `1.234` and `-5` are rejected (it returns `null`).

### Storage (lines ~44 to 80)

**`loadCart()`** runs when the page opens and rebuilds the cart from the browser's memory. It never trusts what is stored (someone could have edited it in DevTools):
- `localStorage.getItem(STORAGE_KEY)` reads the saved text; nothing saved means an empty cart.
- `JSON.parse(raw)` turns the text back into a list; `Array.isArray(data)` confirms it is a list.
- Each row is checked: it must be an object, have a name, a sensible whole-number price and a quantity of at least 1. Bad rows are skipped with `continue`.
- A `Map` (a lookup table) merges duplicates: same name and same price become one row.
- The whole thing sits in `try / catch`, so corrupted data just gives an empty cart instead of breaking the site.

**`saveCart()`**: `localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))` turns the cart into text and saves it. Wrapped in `try / catch` in case the browser blocks storage.

### Cart logic (lines ~82 to 130)

- **`findItem(name, priceCents)`**: finds a cart row with that name **and** price. (Your menu has several "Delicious Pizza" items at different prices, so the name alone isn't enough.)
- **`totalCents()`**: adds up `price × quantity` for every row.
- **`totalQty()`**: adds up all quantities. This is the number shown on the badge (so 2 pizzas and 1 burger shows 3, not 2).
- **`commit()`**: "save and redraw". It runs after any change: `saveCart()`, `renderCart()`, then (if a payment just finished) hides the payment panel, then `clearStatus()` removes any old payment message.
- **`addToCart(name, priceCents, qty)`**: if the item exists, add to its quantity (`Math.min(MAX_QTY, ...)` stops it going above 99); otherwise `cart.push(...)` creates a new row. Then `commit()`.
- **`changeQty(index, delta)`**: the `+`/`−` logic described in Part 1.
- **`removeItem(index)`**: `cart.splice(index, 1)` deletes that row, then `commit()`.
- **`clearCart()`**: sets `cart = []`, deletes the saved copy with `localStorage.removeItem(...)`, and redraws. (It calls `renderCart()` directly, not `commit()`, so it does not wipe the "Payment successful" message that is shown right after.)

### DOM helpers (lines ~132 to 148)

**`make(tag, className, text)`**: builds an HTML element in one line. `make('span', 'cart-qty', '3')` produces `<span class="cart-qty">3</span>`. It uses `document.createElement` and `textContent`, never `innerHTML`.

**`actionButton(action, label, text, className, disabled)`**: builds a button with: `type = 'button'` (so it never submits a form), `dataset.action` (the `increase`/`decrease`/`remove` label), `aria-label` (a description for screen readers, for example "Remove Delicious Pizza from cart") and `disabled` (greyed out when `true`).

### Rendering (lines ~150 to 203)

**`buildRow(item, index)`** draws one cart row:
- `li.dataset.index = String(index)` stores the row's position so a click can later say "row 0".
- A left block has the item name (`<strong>`) and the unit price (`<small>`).
- Then `−`, the quantity, `+`. The `−` is `disabled` when `item.qty <= 1`; the `+` is `disabled` at 99.
- `'\u2212'` is the minus sign and `'\u00d7'` is the × sign, written as codes so the file stays plain text.
- Then the line total (`price × qty`) and the × remove button.

**`renderCart()`** redraws everything that shows cart data:
- Updates every badge (`el.badges.forEach`), the number in the cart header, the total, and the total in the payment panel.
- `el.list.replaceChildren()` empties the list; if the cart is empty it adds "Your cart is empty"; otherwise `cart.forEach(...)` adds one row per item.

**`refocus(index, action)`**: redrawing replaces the buttons, which would drop keyboard focus. This finds the same button again and calls `.focus()`.

**`bumpBadges()`**: the small pop animation on the badge. It removes the `bump` class, then reads `badge.offsetWidth` (this forces the browser to notice the removal), then adds `bump` back so the animation restarts.

### Drawer open/close (lines ~205 to 239)

- **`openDrawer(opener)`**: remembers what was clicked, adds `cart-open` to the body (**this opens the cart**), sets `aria-hidden` to `false` (tells screen readers the cart is visible) and moves focus to the close button.
- **`closeDrawer()`**: the reverse. It removes `cart-open`, sets `aria-hidden` back to `true`, and returns focus to whatever opened it.
- **`onDrawerKeydown(event)`**: keyboard rules while the cart is open. **Escape** closes it. **Tab** is kept *inside* the cart: from the last button it wraps to the first, and Shift+Tab does the reverse, so keyboard users can't tab to the page behind.

### Click handlers (lines ~241 to 287)

- **`onDocumentClick(event)`**: one listener for the whole page (this is called *event delegation*). It checks two things in order: was a food-card cart button clicked (add the item), or the header cart icon (open the cart)? `event.preventDefault()` stops your template's links (`href=""`, `href="#"`) from reloading or jumping the page.
- **`onListClick(event)`**: one listener for the cart list. It finds which button was clicked (`button[data-action]`), which row it belongs to (`li[data-index]`), and runs `changeQty` or `removeItem`. Because the listener is on the whole list, it keeps working for rows created later.

### Test checkout and the payment message (lines ~289 to 325)

- **`showStatus(message, type)`**: writes a message into the payment message box and gives it the colour for `'success'` (green) or `'error'` (red).
- **`clearStatus()`**: empties the box and removes the colour.
- **`onCheckoutClick()`**: "Continue to checkout" reveals the payment panel (`el.panel.hidden = false`) and focuses the amount box.
- **`onPay()`**: runs when **Pay** is clicked (or Enter is pressed in the amount box):
  1. Cart empty? Shows "Your cart is empty." in red.
  2. Converts what you typed with `amountTextToCents`.
  3. If it **exactly equals** the cart total in cents: clears the cart, empties the amount box, and shows **"Payment successful"** in green.
  4. Otherwise (too much, too little, empty or not a number): shows **"Payment unsuccessful"** in red and **keeps** the cart.

No real payment happens. There is no server, no Paystack call, and no secret key anywhere.

### The styles (lines ~327 to 375)

`STYLES` is a block of CSS stored as text. `buildUI` injects it into the page, so you don't need to edit your CSS files. The important rules:
- `.cart-drawer{... transform:translateX(100%); visibility:hidden ...}`: the cart is positioned on the right edge and pushed completely off-screen.
- `body.cart-open .cart-drawer{transform:none; visibility:visible}`: when the body has `cart-open`, the cart slides into view. **This is the CSS half of "opening the cart".**
- `.cart-overlay`: the dark transparent background behind the cart; clicking it closes the cart.
- `.cart-badge`: the small yellow number on the header cart icon.
- `.cart-status.is-success` / `.is-error`: the green and red payment message boxes.
- The last line (`prefers-reduced-motion`) turns off animations for people whose device asks for less movement.

### Building the cart on the page (lines ~377 to 457: `buildUI`)

Because your HTML has no cart section, this function creates it:
1. Creates a `<style>` tag with `STYLES` and puts it in `<head>`.
2. Finds every `.cart_link` icon and adds a badge inside it.
3. Creates the dark overlay and the `<aside>` cart panel (with `role="dialog"` so assistive technology understands it is a pop-up).
4. Creates the header ("Your cart" and the close ×), the list area, and the footer (total, "Continue to checkout" and the hidden test-payment panel with its message box).
5. `document.body.append(...)` places it all at the end of the page.

### Start-up (lines ~459 to the end: `init`)

`init()` runs the whole show: `buildUI()`, then `loadCart()` and `renderCart()` to restore a saved cart, then attaches the listeners (page clicks, list clicks, close button, overlay click, keyboard, checkout, pay, amount typing). It also listens for the browser's `storage` event so two open tabs stay in sync.

The last lines:
```js
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
```
mean: "if the page is still loading, wait until it finishes; otherwise start now."

---

## Part 4: Payment message instead of `alert()`

Before, `onPay()` called `alert('Payment successful')` and `alert('Payment unsuccessful')`, which pop up a browser box. Now a message appears **inside the cart**. Six places changed:

1. **State** (near the top): added `let paymentDone = false;`.
2. **`commit()`**: added the `if (paymentDone) { ... }` block and `clearStatus();`.
3. **Two new functions**: `showStatus` and `clearStatus`, just above `onCheckoutClick`.
4. **`onPay()`**: every `alert(...)` call replaced by `showStatus(..., 'success' | 'error')`.
5. **`STYLES`**: added the three `.cart-status` rules.
6. **`buildUI()`**: creates the message `<div>` (with `role="status"` and `aria-live="polite"` so screen readers announce it) and puts it after the Pay button. **`init()`**: `el.payAmount.addEventListener('input', clearStatus)` hides an old message as soon as you type a new amount.

The exact texts are unchanged: **Payment successful** and **Payment unsuccessful**.

---

## Part 5: Common things you may want to change

| I want to... | Change this |
|---|---|
| Open the cart automatically after adding an item | `OPEN_DRAWER_ON_ADD = true` |
| Allow more than 99 of one item | `MAX_QTY` |
| Change the saved-cart name | `STORAGE_KEY` |
| Change the colours | the `STYLES` block (`#ffbe33` is your template's yellow, `#222831` is the dark colour) |
| Change a message such as "Your cart is empty" | search for the text in `cart.js` |
| Empty the cart while testing | open DevTools (F12), Console, and run `localStorage.removeItem('feaneCart')`, then refresh |

If something doesn't work, open DevTools (F12) and look at the **Console** tab. Any error from `cart.js` will show there with its line number.
