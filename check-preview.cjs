// Run: node check-preview.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/local-preview.js', 'utf8');

function preview(hostname, config = {}) {
    const storage = new Map();
    const window = {SPA_CONFIG: config};
    const context = vm.createContext({
        window, location: {hostname}, structuredClone,
        localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
        FileReader: class {}
    });
    vm.runInContext(source, context);
    return window.SPA_PREVIEW;
}

const local = preview('localhost');
assert(local);
assert.deepEqual(local.get().map(product => product.id),
    ['serum-1', 'serum-2', 'mask-1', 'mask-2', 'body-1', 'body-2']);
assert.deepEqual([local.get()[0].image_zoom, local.get()[0].image_position_x, local.get()[0].image_position_y], [1, 50, 50]);
assert.equal(local.get()[0].price, null);
local.put({id: 'preview', name: 'Added', visible: true, sort_order: 9});
assert.equal(local.get().find(product => product.id === 'preview').name, 'Added');
local.put({id: 'preview', name: 'Edited', visible: false, sort_order: 1});
assert.equal(local.get().find(product => product.id === 'preview').name, 'Edited');
local.remove('preview');
assert.equal(local.get().some(product => product.id === 'preview'), false);
assert.equal(preview('example.com'), undefined);
assert.equal(preview('localhost', {url: 'https://example.supabase.co', publishableKey: 'public'}), undefined);
console.log('PASS: six stable preview IDs, local add/edit/delete persistence, localhost-only gate, configured Supabase wins.');
