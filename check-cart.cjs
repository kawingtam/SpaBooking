// Run: node check-cart.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(__dirname + '/app.js', 'utf8');
new vm.Script(script);
const sql = fs.readFileSync(__dirname + '/supabase-setup.sql', 'utf8');
const seeded = [...sql.matchAll(/^\('([^']+)', '([^']+)'/gm)].map(m => ({id:m[1], name:m[2]}));
const catalog = 'const products = ' + JSON.stringify(seeded) + '; let catalogReady = true;';
const validation = script.slice(script.indexOf('function validCart('), script.indexOf('function orderMessage('));
const message = script.slice(script.indexOf('function orderMessage('), script.indexOf('function saveCart('));
const checkout = script.slice(script.indexOf("document.getElementById('checkout')?.addEventListener"), script.indexOf('    renderCart();', script.indexOf("document.getElementById('checkout')?.addEventListener")));
let click, opened;
const context = vm.createContext({ document: { getElementById: () => ({ addEventListener: (_, fn) => click = fn }) }, window: { open: (...args) => opened = args } });
vm.runInContext(catalog + validation + message + 'let cart = {};' + checkout, context);
const evaluate = code => vm.runInContext(code, context);
for (const value of ['null', '{}', '[]', '{"serum-1":0}', '{"serum-1":100}', '{"serum-1":1.5}', '{"serum-1":"2"}', '{"unknown":2}']) {
    assert.equal(evaluate(`JSON.stringify(validCart(${value}))`), '{}');
}
assert.equal(evaluate('JSON.stringify(validCart({"serum-1":2,"mask-1":99,"unknown":1}))'), '{"serum-1":2,"mask-1":99}');
click(); assert.equal(opened, undefined);
evaluate('cart = {"serum-1":2,"body-1":1}');
click();
const url = new URL(opened[0]);
assert.equal(url.origin + url.pathname, 'https://wa.me/85291376887');
assert.equal(url.searchParams.get('text'), '你好，我想查詢以下產品：\n保濕精華（示例） × 2\n身體護理乳（示例） × 1\n\n請確認價格、庫存及付款 / 取貨或送貨方式，謝謝！');
assert.equal(evaluate('cart["serum-1"]'), 2);
console.log('PASS: validation, empty checkout, quantities, encoded WhatsApp recipient/message, retained basket, script syntax.');

const home = fs.readFileSync(__dirname + '/index.html', 'utf8');
const shop = fs.readFileSync(__dirname + '/products.html', 'utf8');
assert(!home.includes('id="products"'));
assert(shop.includes('id="products"') && shop.includes('id="cart"'));
assert.equal(evaluate('products.length'), 6);
assert.equal(evaluate('new Set(products.map(p => p.id)).size'), 6);
for (const file of ['index.html', 'products.html']) {
    const page = fs.readFileSync(__dirname + '/' + file, 'utf8');
    for (const [, href] of page.matchAll(/(?:href|src)="([^"?]+)"/g)) {
        if (/^https?:/.test(href)) continue;
        const [path, anchor] = href.split('#');
        const targetPath = __dirname + '/' + (path || file);
        assert(fs.existsSync(targetPath), file + ': ' + href);
        if (anchor) assert(fs.readFileSync(targetPath, 'utf8').includes('id="' + anchor + '"'), file + ': ' + href);
    }
}
console.log('PASS: separate pages, six unique products, local assets and navigation targets.');

const add = script.slice(script.indexOf('function addToCart('), script.indexOf('function productArtwork('));
vm.runInContext('function saveCart() {}' + add, context);
evaluate('cart = {}; addToCart("serum-1"); addToCart("serum-1")');
assert.equal(evaluate('cart["serum-1"]'), 2);
evaluate('cart["serum-1"] = 99; addToCart("serum-1"); addToCart("unknown")');
assert.equal(evaluate('JSON.stringify(cart)'), '{"serum-1":99}');
evaluate('catalogReady = false; addToCart("mask-1")');
assert.equal(evaluate('cart["mask-1"]'), undefined);
evaluate('products.splice(0,1)');
assert.equal(evaluate('JSON.stringify(validCart(cart))'), '{}');
for (const name of ['admin.js','supabase-config.js']) new vm.Script(fs.readFileSync(__dirname+'/'+name,'utf8'));
console.log('PASS: shared add action, quantity cap, unavailable catalog guard, removed product pruning, admin/config syntax.');

// Verify successful loads prune stale IDs, while outages preserve the saved basket.
const nodes = Object.fromEntries(['products-status','checkout','cart-items'].map(id=>[id,{textContent:'',setAttribute(){}}]));
let stored='{"serum-1":2,"deleted":1}', failed=false, requestURL;
const loadingContext = vm.createContext({URL, URLSearchParams, AbortSignal,
    document:{getElementById:id=>nodes[id]}, console:{error(){}},
    window:{SPA_CONFIG:{url:'https://example.supabase.co',publishableKey:'public'}},
    localStorage:{getItem:()=>stored,setItem:(_,value)=>stored=value},
    fetch:async url=>{requestURL=url; if(failed) throw Error('offline'); return {ok:true,json:async()=>[{id:'serum-1',title:'Serum'}]};}
});
vm.runInContext('let products=[], cart={},catalogReady=false,catalogLoading=false; const cartKey="ageless-spa-cart", detail=null; function renderProducts(){}; function saveCart(){localStorage.setItem(cartKey,JSON.stringify(cart));}'+validation+script.slice(script.indexOf('async function loadProducts()'),script.indexOf("    document.getElementById('retry-products')")),loadingContext);
(async()=>{
    await vm.runInContext('loadProducts()',loadingContext);
    assert.equal(stored,'{"serum-1":2}');
    assert.equal(requestURL.searchParams.get('active'),'eq.true');
    assert.equal(requestURL.searchParams.get('order'),'sort_order.asc,id.asc');
    failed=true;await vm.runInContext('loadProducts()',loadingContext);
    assert.equal(stored,'{"serum-1":2}');
    assert.equal(vm.runInContext('catalogReady',loadingContext),false);
    assert.match(nodes['products-status'].textContent,/暫時未能載入/);
    console.log('PASS: active-only ordered query, stale cart pruning, outage preserves localStorage and disables checkout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
