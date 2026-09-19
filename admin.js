const loginForm = document.getElementById('login-form');
const manager = document.getElementById('manager');
const form = document.getElementById('product-form');
const fields = document.getElementById('product-fields');
const adminStatus = document.getElementById('admin-status');
const formStatus = document.getElementById('form-status');
const preview = document.getElementById('photo-preview');
const saveButton = document.getElementById('save-product');
let client, editing, draftId, pendingPhoto, previewURL, busy = false;
const categories = {serum: '精華護理', mask: '面膜護理', body: '身體護理'};
const textFields = ['title', 'category', 'size', 'short_description', 'full_description', 'usage', 'highlights'];
const field = name => form.elements.namedItem(name);
function announce(element, message) { element.textContent = message; element.focus(); }
function showList(message = '') {
    form.hidden = true; manager.hidden = false;
    announce(adminStatus, message);
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;
}
function openForm(product) {
    editing = product || null;
    draftId = product?.id || crypto.randomUUID();
    pendingPhoto = null;
    form.reset();
    for (const key of textFields) field(key).value = product?.[key] || (key === 'category' ? 'serum' : '');
    field('active').checked = product?.active ?? true;
    field('sort_order').value = product?.sort_order ?? 0;
    document.getElementById('visibility-label').textContent = field('active').checked ? 'ON · 顯示' : 'OFF · 隱藏';
    preview.hidden = !product?.image_url;
    preview.removeAttribute('src');
    if (product?.image_url) preview.src = product.image_url;
    document.getElementById('form-title').textContent = product ? '編輯產品' : '新增產品';
    saveButton.textContent = product ? '儲存變更' : '儲存產品';
    document.getElementById('delete-product').hidden = !product;
    formStatus.textContent = ''; adminStatus.textContent = '';
    manager.hidden = true; form.hidden = false;
    field('title').focus();
}
async function loadList() {
    const list = document.getElementById('admin-products');
    const rows = [];
    for (let from = 0; ; from += 1000) {
        const {data, error} = await client.from('products').select('*').order('sort_order').order('id').range(from, from + 999);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) break;
    }
    list.replaceChildren();
    if (!rows.length) list.textContent = '還未有產品。點選「＋ 新增產品」開始。';
    for (const product of rows) {
        const card = document.createElement('article'); card.className = 'admin-product';
        if (product.image_url) {
            const img = document.createElement('img'); img.src = product.image_url; img.alt = product.title;
            img.addEventListener('error', () => { img.hidden = true; }); card.append(img);
        }
        const title = document.createElement('h3'); title.textContent = product.title;
        const category = document.createElement('p'); category.textContent = categories[product.category];
        const badge = document.createElement('span'); badge.className = 'badge' + (product.active ? '' : ' hidden-badge');
        badge.textContent = product.active ? '顯示中 · Visible' : '已隱藏 · Hidden';
        const actions = document.createElement('div'); actions.className = 'admin-actions';
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '編輯';
        edit.setAttribute('aria-label', '編輯 ' + product.title);
        edit.addEventListener('click', () => { if (!busy) openForm(product); });
        const hide = document.createElement('button'); hide.type = 'button'; hide.textContent = product.active ? '隱藏產品' : '顯示產品';
        hide.addEventListener('click', async () => {
            if (busy) return;
            busy = true; hide.disabled = true;
            let saved = false;
            try {
                const {error} = await client.from('products').update({active: !product.active}).eq('id', product.id).select('id').single();
                if (error) throw error;
                saved = true;
                await loadList();
                announce(adminStatus, product.active ? '產品已隱藏。' : '產品已在商店顯示。');
            } catch (error) {
                console.error(error);
                announce(adminStatus, saved ? '變更已儲存。清單暫未能更新，請重新載入清單。' : '未能更改顯示狀態，請再試一次。');
            } finally { busy = false; hide.disabled = false; }
        });
        card.addEventListener('click', event => { if (!busy && !event.target.closest('button')) openForm(product); });
        actions.append(edit, hide); card.append(title, category, badge, actions); list.append(card);
    }
}
async function authorize(session) {
    if (!session) { manager.hidden = true; form.hidden = true; loginForm.hidden = false; return; }
    const {data, error} = await client.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
        await client.auth.signOut({scope: 'local'});
        throw new Error('Not an authorized owner');
    }
    loginForm.hidden = true;
    // Returning from a phone's photo picker must not reset an in-progress form.
    if (form.hidden) { manager.hidden = false; await loadList(); }
}
loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = loginForm.querySelector('button'); button.disabled = true; button.textContent = '登入中…';
    try {
        const {data, error} = await client.auth.signInWithPassword({email: loginForm.elements.email.value.trim(), password: loginForm.elements.password.value});
        if (error) throw error;
        await authorize(data.session);
        loginForm.reset(); adminStatus.textContent = '';
    } catch (error) {
        console.error(error);
        announce(adminStatus, '未能登入管理頁面。請確認店主電郵、密碼及網絡後再試。');
    } finally { button.disabled = false; button.textContent = '登入 Log In'; }
});
document.getElementById('logout').addEventListener('click', async () => {
    if (busy) return;
    const {error} = await client.auth.signOut({scope: 'local'});
    if (error) { announce(adminStatus, '暫時未能登出，請再試一次。'); return; }
    manager.hidden = true; form.hidden = true; loginForm.hidden = false;
    form.reset(); document.getElementById('admin-products').replaceChildren();
    announce(adminStatus, '已登出。');
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
    const file = field('photo').files[0];
    previewURL = file ? URL.createObjectURL(file) : null;
    preview.hidden = !previewURL && !editing?.image_url;
    if (!preview.hidden) preview.src = previewURL || editing.image_url;
});
// Only remove photos managed by this bucket, never arbitrary URLs.
async function removePhoto(url) {
    const prefix = client.storage.from('product-images').getPublicUrl('').data.publicUrl;
    if (!url || !url.startsWith(prefix)) return;
    const path = url.slice(prefix.length);
    if (!path) return;
    const {error} = await client.storage.from('product-images').remove([path]);
    if (error) console.warn('Unused photo cleanup failed', error);
}
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const values = Object.fromEntries(textFields.map(key => [key, field(key).value.trim()]));
    if (!values.title || !values.short_description || !values.full_description) {
        announce(formStatus, '請填寫產品名稱、簡短介紹及完整介紹。'); return;
    }
    values.active = field('active').checked;
    values.sort_order = Number(field('sort_order').value);
    const file = field('photo').files[0];
    const extensions = {'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp'};
    if (file && (!extensions[file.type] || file.size > 10485760 || !file.size)) {
        announce(formStatus, '照片未能上載。請選擇 10 MB 以下的 JPG、PNG 或 WebP 照片，再按儲存。其他資料已保留。'); return;
    }
    busy = true; fields.disabled = true; saveButton.textContent = '儲存中…'; formStatus.textContent = '正在儲存，請稍候…';
    let uploading = false, saved = false;
    try {
        values.image_url = editing?.image_url || '';
        if (file) {
            if (pendingPhoto?.file !== file) {
                uploading = true; formStatus.textContent = '正在上載照片…';
                const path = draftId + '/' + crypto.randomUUID() + '.' + extensions[file.type];
                const {error} = await client.storage.from('product-images').upload(path, file, {contentType: file.type, upsert: false});
                if (error) throw error;
                pendingPhoto = {file, url: client.storage.from('product-images').getPublicUrl(path).data.publicUrl};
                uploading = false;
            }
            values.image_url = pendingPhoto.url;
        }
        // A stable draft ID makes retries safe if the first response is lost.
        const query = editing ? client.from('products').update(values).eq('id', editing.id)
            : client.from('products').upsert({id: draftId, ...values}, {onConflict: 'id'});
        const {error} = await query.select('id').single();
        if (error) throw error;
        saved = true;
        if (editing?.image_url && editing.image_url !== values.image_url) {
            try { await removePhoto(editing.image_url); } catch (error) { console.warn(error); }
        }
        showList('產品已成功儲存。');
        await loadList();
    } catch (error) {
        console.error(error);
        if (saved) announce(adminStatus, '產品已成功儲存。清單暫未能更新，請重新載入清單。');
        else announce(formStatus, uploading ? '照片未能上載，產品尚未儲存。資料已保留，請再按儲存重試。' : '暫時未能確認儲存結果。資料已保留，請再按儲存重試。');
        // ponytail: aborted/ambiguous saves may leave an unused photo. Retain it
        // rather than risk deleting a committed image; add cleanup only if storage usage warrants it.
    } finally { busy = false; fields.disabled = false; saveButton.textContent = editing ? '儲存變更' : '儲存產品'; }
});
document.getElementById('delete-product').addEventListener('click', async () => {
    if (busy || !editing || !confirm('刪除「' + editing.title + '」？\n此操作無法復原。建議先使用「隱藏產品」。')) return;
    busy = true; fields.disabled = true;
    let deleted = false;
    try {
        const {error} = await client.from('products').delete().eq('id', editing.id).select('id').single();
        if (error) throw error;
        deleted = true;
        try { await removePhoto(editing.image_url); } catch (error) { console.warn(error); }
        showList('產品已刪除。'); await loadList();
    } catch (error) {
        console.error(error);
        announce(deleted ? adminStatus : formStatus, deleted ? '產品已刪除。請重新載入清單。' : '暫時未能確認刪除結果，請重新載入清單查看。');
    } finally { busy = false; fields.disabled = false; }
});
(async () => {
    try {
        const config = window.SPA_CONFIG;
        if (!config?.url || !config?.publishableKey || !window.supabase) throw new Error('Admin configuration unavailable');
        client = window.supabase.createClient(config.url, config.publishableKey);
        client.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                manager.hidden = true; form.hidden = true; loginForm.hidden = false;
                adminStatus.textContent = '請登入以繼續管理產品。';
            }
        });
        const {data, error} = await client.auth.getSession();
        if (error) throw error;
        await authorize(data.session);
    } catch (error) {
        console.error(error);
        loginForm.hidden = !client;
        announce(adminStatus, '管理頁面暫時未能開啟。請重新整理再試；若仍無法開啟，請聯絡網站管理員完成設定。');
    }
})();
