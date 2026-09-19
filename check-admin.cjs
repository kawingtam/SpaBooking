// Run: node check-admin.cjs (no dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/admin.js', 'utf8');
const page = fs.readFileSync(__dirname + '/admin.html', 'utf8');

new vm.Script(source);
assert(!page.includes('type="email"'));
assert(page.includes('type="password"') && page.includes('required'));
assert(source.includes("let client, editing, pendingPhoto, previewURL, adminPassword = ''"));
assert(!source.includes('localStorage') && !source.includes('sessionStorage') && !source.includes('document.cookie'));
assert(source.includes("adminApi('verify_password')"));
assert(source.includes("adminApi('list_products')"));
assert(source.includes("adminApi('create_product'"));
assert(source.includes("adminApi('update_product'"));
assert(source.includes("adminApi('delete_product'"));
assert(source.includes("adminApi('set_visibility'"));
assert(source.includes("adminApi('reorder_products'"));
assert(source.includes("adminApi('create_signed_upload'"));
assert(source.includes('uploadToSignedUrl'));
assert(source.includes('values.price = price === \'\' ? null'));
assert(source.includes('image_position_x') && source.includes('image_position_y'));
assert(source.includes('persistSession: false'));
assert(!source.includes('service_role') && !source.includes('sb_secret_'));
console.log('PASS: password-only memory auth, all Edge Function actions, signed upload, nullable price, image position, and browser-safe client configuration.');
