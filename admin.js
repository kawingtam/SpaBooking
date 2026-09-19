const loginForm = document.getElementById('login-form');
const manager = document.getElementById('manager');
const form = document.getElementById('product-form');
const fields = document.getElementById('product-fields');
const adminStatus = document.getElementById('admin-status');
const formStatus = document.getElementById('form-status');
const preview = document.getElementById('photo-preview');
const photoFrame = document.getElementById('photo-frame');
const photoControls = document.getElementById('photo-position-controls');
const photoZoom = document.getElementById('photo-zoom');
const saveButton = document.getElementById('save-product');
const localPreview = window.SPA_PREVIEW;
const categories = {serum: '精華護理', mask: '面膜護理', body: '身體護理'};
const textFields = ['name', 'category', 'size', 'short_description', 'full_description'];
const field = name => form.elements.namedItem(name === 'name' ? 'title' : name);
let client, editing, pendingPhoto, previewURL, adminPassword = '', busy = false;
let imagePosition = {zoom: 1, x: 50, y: 50};

function announce(element, message) { element.textContent = message; element.focus(); }
function imageUrl(path) {
    if (!path) return '';
    return localPreview ? path : new URL('/storage/v1/object/public/product-images/' + path.split('/').map(encodeURIComponent).join('/'), window.SPA_CONFIG.url).href;
}
async function adminApi(action, payload = {}) {
    const response = await fetch(new URL('/functions/v1/admin-products', window.SPA_CONFIG.url), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', apikey: window.SPA_CONFIG.publishableKey},
        body: JSON.stringify({action, password: adminPassword, ...payload}),
        signal: AbortSignal.timeout(20000), cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `Request failed: ${response.status}`);
    return result;
}
function showList(message = '') {
    form.hidden = true; manager.hidden = false;
    announce(adminStatus, message);
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;
}
function positionPhoto() {
    photoFrame.style.setProperty('--image-zoom', imagePosition.zoom);
    photoFrame.style.setProperty('--image-x', imagePosition.x + '%');
    photoFrame.style.setProperty('--image-y', imagePosition.y + '%');
    photoZoom.value = imagePosition.zoom;
}
function openForm(product) {
    editing = product || null; pendingPhoto = null; form.reset();
    for (const key of textFields) field(key).value = product?.[key] || (key === 'category' ? 'serum' : '');
    field('price').value = product?.price ?? '';
    field('active').checked = product?.visible ?? true;
    field('sort_order').value = product?.sort_order ?? 0;
    document.getElementById('visibility-label').textContent = field('active').checked ? 'ON · 顯示' : 'OFF · 隱藏';
    imagePosition = {zoom: product?.image_zoom || 1, x: product?.image_position_x ?? 50, y: product?.image_position_y ?? 50};
    photoFrame.hidden = photoControls.hidden = !product?.image_path;
    preview.removeAttribute('src');
    if (product?.image_path) preview.src = imageUrl(product.image_path);
    positionPhoto();
    document.getElementById('form-title').textContent = product ? '編輯產品' : '新增產品';
    saveButton.textContent = product ? '儲存變更' : '儲存產品';
    document.getElementById('delete-product').hidden = !product;
    formStatus.textContent = ''; adminStatus.textContent = '';
    manager.hidden = true; form.hidden = false; field('name').focus();
}
async function products() {
    if (localPreview) return localPreview.get().sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
    return (await adminApi('list_products')).products;
}
async function reorder(rows, from, to) {
    if (to < 0 || to >= rows.length || busy) return;
    busy = true;
    const reordered = [...rows];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    try {
        if (localPreview) reordered.forEach((product, sort_order) => localPreview.put({...product, sort_order}));
        else await adminApi('reorder_products', {product_ids: reordered.map(product => product.id)});
        await loadList(); announce(adminStatus, '產品次序已更新。');
    } catch (error) {
        console.error(error); announce(adminStatus, '未能更新產品次序，請重新載入後再試。');
    } finally { busy = false; }
}
async function loadList() {
    const list = document.getElementById('admin-products');
    const rows = await products(); list.replaceChildren();
    if (!rows.length) list.textContent = '還未有產品。點選「＋ 新增產品」開始。';
    rows.forEach((product, index) => {
        const card = document.createElement('article'); card.className = 'admin-product';
        if (product.image_path) {
            const img = document.createElement('img'); img.src = imageUrl(product.image_path); img.alt = product.name;
            img.addEventListener('error', () => { img.hidden = true; }); card.append(img);
        }
        const title = document.createElement('h3'); title.textContent = product.name;
        const category = document.createElement('p'); category.textContent = categories[product.category] || product.category || '';
        const badge = document.createElement('span'); badge.className = 'badge' + (product.visible ? '' : ' hidden-badge');
        badge.textContent = product.visible ? '顯示中 · Visible' : '已隱藏 · Hidden';
        const actions = document.createElement('div'); actions.className = 'admin-actions';
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '編輯';
        edit.setAttribute('aria-label', '編輯 ' + product.name); edit.addEventListener('click', () => { if (!busy) openForm(product); });
        const visibility = document.createElement('button'); visibility.type = 'button'; visibility.textContent = product.visible ? '隱藏產品' : '顯示產品';
        visibility.addEventListener('click', async () => {
            if (busy) return;
            busy = true; visibility.disabled = true;
            try {
                if (localPreview) localPreview.put({...product, visible: !product.visible});
                else await adminApi('set_visibility', {id: product.id, visible: !product.visible});
                await loadList(); announce(adminStatus, product.visible ? '產品已隱藏。' : '產品已在商店顯示。');
            } catch (error) {
                console.error(error); announce(adminStatus, '未能更改顯示狀態，請再試一次。');
            } finally { busy = false; visibility.disabled = false; }
        });
        const up = document.createElement('button'); up.type = 'button'; up.textContent = '↑'; up.disabled = index === 0;
        up.setAttribute('aria-label', '將 ' + product.name + ' 向上移'); up.addEventListener('click', () => reorder(rows, index, index - 1));
        const down = document.createElement('button'); down.type = 'button'; down.textContent = '↓'; down.disabled = index === rows.length - 1;
        down.setAttribute('aria-label', '將 ' + product.name + ' 向下移'); down.addEventListener('click', () => reorder(rows, index, index + 1));
        card.addEventListener('click', event => { if (!busy && !event.target.closest('button')) openForm(product); });
        actions.append(edit, visibility, up, down); card.append(title, category, badge, actions); list.append(card);
    });
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = loginForm.querySelector('button'); button.disabled = true; button.textContent = '登入中…';
    try {
        adminPassword = loginForm.elements.password.value;
        if (!localPreview) await adminApi('verify_password');
        loginForm.reset(); loginForm.hidden = true; manager.hidden = false; adminStatus.textContent = ''; await loadList();
    } catch (error) {
        adminPassword = ''; console.error(error); announce(adminStatus, '未能登入管理頁面。請確認密碼及網絡後再試。');
    } finally { button.disabled = false; button.textContent = '登入 Log In'; }
});
document.getElementById('logout').addEventListener('click', () => {
    if (busy) return;
    adminPassword = ''; editing = null; pendingPhoto = null;
    manager.hidden = true; form.hidden = true; loginForm.hidden = false;
    form.reset(); document.getElementById('admin-products').replaceChildren(); announce(adminStatus, '已登出。');
});
document.getElementById('new-product').addEventListener('click', () => { if (!busy) openForm(); });
document.getElementById('cancel-edit').addEventListener('click', () => showList());
document.getElementById('reload-admin').addEventListener('click', async () => {
    try { await loadList(); announce(adminStatus, '清單已更新。'); }
    catch (error) { console.error(error); announce(adminStatus, '清單暫時未能載入，請再試一次。'); }
});
field('active').addEventListener('change', () => {
    document.getElementById('visibility-label').textContent = field('active').checked ? 'ON · 顯示' : 'OFF · 隱藏';
});
field('photo').addEventListener('change', () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    const file = field('photo').files[0]; previewURL = file ? URL.createObjectURL(file) : null;
    photoFrame.hidden = photoControls.hidden = !previewURL && !editing?.image_path;
    if (!photoFrame.hidden) preview.src = previewURL || imageUrl(editing.image_path);
    if (previewURL) imagePosition = {zoom: 1, x: 50, y: 50};
    positionPhoto();
});
photoZoom.addEventListener('input', () => { imagePosition.zoom = Number(photoZoom.value); positionPhoto(); });
photoFrame.addEventListener('pointerdown', event => {
    photoFrame.setPointerCapture(event.pointerId); photoFrame.dataset.x = event.clientX; photoFrame.dataset.y = event.clientY;
});
photoFrame.addEventListener('pointermove', event => {
    if (!photoFrame.hasPointerCapture(event.pointerId)) return;
    const box = photoFrame.getBoundingClientRect();
    imagePosition.x = Math.max(0, Math.min(100, imagePosition.x - (event.clientX - photoFrame.dataset.x) / box.width * 100));
    imagePosition.y = Math.max(0, Math.min(100, imagePosition.y - (event.clientY - photoFrame.dataset.y) / box.height * 100));
    photoFrame.dataset.x = event.clientX; photoFrame.dataset.y = event.clientY; positionPhoto();
});
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const values = Object.fromEntries(textFields.map(key => [key, field(key).value.trim() || null]));
    const price = field('price').value.trim();
    values.name = field('name').value.trim(); values.price = price === '' ? null : Number(price);
    values.sort_order = Number(field('sort_order').value);
    values.image_zoom = imagePosition.zoom; values.image_position_x = imagePosition.x; values.image_position_y = imagePosition.y;
    values.image_path = editing?.image_path || null;
    const visible = field('active').checked;
    const file = field('photo').files[0];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxPhotoSize = localPreview ? 3000000 : 10485760;
    if (file && (!allowed.includes(file.type) || file.size > maxPhotoSize || !file.size)) {
        announce(formStatus, `照片未能上載。請選擇 ${localPreview ? '3' : '10'} MB 以下的 JPG、PNG 或 WebP 照片，再按儲存。其他資料已保留。`); return;
    }
    busy = true; fields.disabled = true; saveButton.textContent = '儲存中…'; formStatus.textContent = '正在儲存，請稍候…';
    try {
        if (file) {
            if (localPreview) values.image_path = await localPreview.image(file);
            else {
                if (pendingPhoto?.file !== file) {
                    formStatus.textContent = '正在上載照片…';
                    const {upload} = await adminApi('create_signed_upload', {content_type: file.type});
                    const {error} = await client.storage.from(upload.bucket).uploadToSignedUrl(upload.path, upload.token, file, {contentType: file.type});
                    if (error) throw error;
                    pendingPhoto = {file, path: upload.path};
                }
                values.image_path = pendingPhoto.path;
            }
        }
        if (localPreview) localPreview.put({id: editing?.id || crypto.randomUUID(), ...values, visible});
        else if (editing) {
            await adminApi('update_product', {id: editing.id, product: values});
            if (visible !== editing.visible) await adminApi('set_visibility', {id: editing.id, visible});
        } else await adminApi('create_product', {product: {...values, visible}});
        showList('產品已成功儲存。'); await loadList();
    } catch (error) {
        console.error(error); announce(formStatus, '暫時未能儲存。資料已保留，請再按儲存重試。');
    } finally { busy = false; fields.disabled = false; saveButton.textContent = editing ? '儲存變更' : '儲存產品'; }
});
document.getElementById('delete-product').addEventListener('click', async () => {
    if (busy || !editing || !confirm('刪除「' + editing.name + '」？\n此操作無法復原。建議先使用「隱藏產品」。')) return;
    busy = true; fields.disabled = true;
    try {
        if (localPreview) localPreview.remove(editing.id); else await adminApi('delete_product', {id: editing.id});
        showList('產品已刪除。'); await loadList();
    } catch (error) {
        console.error(error); announce(formStatus, '暫時未能刪除產品，請重新載入清單查看。');
    } finally { busy = false; fields.disabled = false; }
});

try {
    if (localPreview) {
        document.getElementById('preview-badge').hidden = false;
        document.getElementById('preview-password-help').hidden = false;
        document.getElementById('photo-help').textContent = '可選擇相簿或拍照（視手機支援）。Local Preview 可使用 3 MB 以下的 JPG、PNG 或 WebP。';
    } else {
        const config = window.SPA_CONFIG;
        if (!config?.url || !config?.publishableKey || !window.supabase) throw new Error('Admin configuration unavailable');
        client = window.supabase.createClient(config.url, config.publishableKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
    }
    loginForm.hidden = false;
} catch (error) {
    console.error(error); announce(adminStatus, '管理頁面暫時未能開啟。請重新整理再試；若仍無法開啟，請聯絡網站管理員完成設定。');
}
