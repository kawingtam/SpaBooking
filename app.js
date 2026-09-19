
    const menu = document.getElementById('menu');
    const toggle = document.getElementById('menu-toggle');
    toggle.addEventListener('click', () => {
        if (menu.open) return menu.close();
        menu.prepend(toggle);
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', '關閉選單');
        menu.showModal();
        toggle.focus();
    });
    menu.addEventListener('close', () => {
        document.body.prepend(toggle);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '開啟選單');
        toggle.focus();
    });
    menu.addEventListener('click', event => {
        if (event.target === menu && event.clientX >= menu.getBoundingClientRect().right) menu.close();
    });
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', () => {
            if (menu.open) menu.close();
        });
    });

    let products = [];
    let catalogReady = false;
    let catalogLoading = false;
    const cartKey = 'ageless-spa-cart';
    const status = document.getElementById('cart-status');
    let cart = {};
    function validCart(value) {
        return Object.fromEntries(products.filter(p => Number.isInteger(value?.[p.id]) && value[p.id] > 0 && value[p.id] <= 99)
            .map(p => [p.id, value[p.id]]));
    }

    function orderMessage() {
        return ['你好，我想查詢以下產品：', ...products.filter(p => cart[p.id]).map(p => `${p.name} × ${cart[p.id]}`),
            '', '請確認價格、庫存及付款 / 取貨或送貨方式，謝謝！'].join('\n');
    }
    function saveCart(message) {
        try {
            localStorage.setItem(cartKey, JSON.stringify(cart));
            if (status) status.textContent = message;
        } catch {
            if (status) status.textContent = message + ' 此瀏覽器未能儲存購物籃，重新整理後可能遺失。';
        }
        renderCart();
    }
    function renderCart() {
        const items = document.getElementById('cart-items');
        document.getElementById('cart-count').textContent = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
        if (!items) return;
        items.replaceChildren();
        let count = 0;
        for (const product of products) {
            if (!cart[product.id]) continue;
            count += cart[product.id];
            const row = document.createElement('div');
            row.className = 'cart-row';
            const name = document.createElement('strong');
            name.textContent = product.name;
            const label = document.createElement('label');
            label.textContent = '數量 ';
            const quantity = document.createElement('input');
            quantity.type = 'number'; quantity.min = '1'; quantity.max = '99'; quantity.step = '1';
            quantity.value = cart[product.id];
            quantity.setAttribute('aria-label', product.name + ' 數量');
            quantity.addEventListener('change', () => {
                const value = Number(quantity.value);
                if (!Number.isInteger(value) || value < 1 || value > 99) {
                    quantity.value = cart[product.id];
                    status.textContent = '請輸入 1 至 99 的整數數量。';
                    return;
                }
                cart[product.id] = value;
                saveCart('已更新數量。');
                document.getElementById('cart-items').querySelectorAll('input')[products.filter(p => cart[p.id]).indexOf(product)].focus();
            });
            label.append(quantity);
            const remove = document.createElement('button');
            remove.type = 'button'; remove.textContent = '移除';
            remove.setAttribute('aria-label', '移除' + product.name);
            remove.addEventListener('click', () => {
                delete cart[product.id]; saveCart('已移除' + product.name + '。');
                (document.querySelector('#cart-items button') || toggle).focus();
            });
            row.append(name, label, remove); items.append(row);
        }
        if (!count) items.textContent = '購物籃尚未有產品。請先到產品區選購。';
        document.getElementById('cart-count').textContent = count;
        document.getElementById('checkout').disabled = !count || !catalogReady;
    }
    function addToCart(productId) {
        if (!catalogReady) return false;
        const product = products.find(p => p.id === productId);
        if (!product) return false;
        cart[product.id] = Math.min(99, (cart[product.id] || 0) + 1);
        saveCart('已加入' + product.name + '。');
        return true;
    }
    function priceText(product) {
        const price = Number(product.price);
        return product.price !== null && product.price !== '' && Number.isFinite(price) && price >= 0
            ? '$' + price.toFixed(2) : '價格請洽店主';
    }
    function productArtwork(product) {
        const art = document.createElement('div');
        art.className = 'product-art ' + product.category;
        if (product.image_path) {
            const img = document.createElement('img');
            img.src = window.SPA_PREVIEW ? product.image_path : new URL('/storage/v1/object/public/product-images/' + product.image_path.split('/').map(encodeURIComponent).join('/'), window.SPA_CONFIG.url).href;
            img.alt = product.name; img.loading = 'lazy';
            art.style.setProperty('--image-zoom', product.image_zoom || 1);
            art.style.setProperty('--image-x', (product.image_position_x ?? 50) + '%');
            art.style.setProperty('--image-y', (product.image_position_y ?? 50) + '%');
            img.addEventListener('error', () => { art.textContent = '圖片暫未提供'; });
            art.append(img);
        } else {
            art.setAttribute('aria-label', '示例包裝');
            art.style.setProperty('--paper', product.paper || '#ecddc8');
            art.style.setProperty('--bottle', product.color || '#ddc19e');
            const pack = document.createElement('div'); pack.className = 'product-pack';
            const brand = document.createElement('b'); brand.textContent = 'AGELESS';
            const label = document.createElement('small'); label.textContent = '示例包裝';
            pack.append(brand, label); art.append(pack);
        }
        return art;
    }
    const detail = document.getElementById('product-detail');
    function showProduct(product) {
        const content = document.getElementById('product-detail-content');
        content.replaceChildren(productArtwork(product));
        const title = document.createElement('h2'); title.id = 'product-detail-title'; title.textContent = product.name;
        content.append(title);
        for (const [heading, text] of [['', product.size], ['', product.full_description]]) {
            if (!text?.trim()) continue;
            if (heading) { const h = document.createElement('h3'); h.textContent = heading; content.append(h); }
            const paragraph = document.createElement('p'); paragraph.textContent = text; content.append(paragraph);
        }
        const add = document.createElement('button'); add.className = 'btn'; add.textContent = '加入購物籃';
        add.addEventListener('click', () => { if (addToCart(product.id)) document.getElementById('detail-status').textContent = '已加入購物籃。'; });
        content.append(add);
        document.getElementById('detail-status').textContent = '';
        detail.showModal();
    }
    document.getElementById('close-detail')?.addEventListener('click', () => detail.close());
    detail?.addEventListener('click', event => {
        const box = detail.getBoundingClientRect();
        if (event.target === detail && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) detail.close();
    });
    function renderProducts() {
        if (!document.getElementById('products')) return;
        document.querySelectorAll('.product-category .services-grid').forEach(grid => grid.replaceChildren());
        for (const product of products) {
            const card = document.createElement('article'); card.className = 'service-card product-card';
            const name = document.createElement('h4'); name.textContent = product.name;
            const note = document.createElement('p'); note.className = 'product-summary'; note.textContent = product.short_description;
            const size = document.createElement('p'); size.textContent = [product.size, priceText(product)].filter(Boolean).join(' · ');
            const details = document.createElement('button'); details.type = 'button'; details.className = 'detail-link'; details.textContent = '查看詳情';
            details.setAttribute('aria-label', '查看詳情：' + product.name);
            details.addEventListener('click', () => showProduct(product));
            const add = document.createElement('button'); add.type = 'button'; add.className = 'btn'; add.textContent = '加入購物籃';
            add.setAttribute('aria-label', '加入購物籃：' + product.name);
            add.addEventListener('click', () => { if (addToCart(product.id)) add.textContent = '已加入 · 繼續加入'; });
            card.addEventListener('click', event => { if (!event.target.closest('button')) { details.focus({preventScroll: true}); showProduct(product); } });
            card.append(productArtwork(product), name, size, note, details, add);
            document.querySelector('#category-' + product.category + ' .services-grid').append(card);
        }
    }
    document.getElementById('checkout')?.addEventListener('click', () => {
        if (!catalogReady || !Object.keys(cart).length) return;
        window.open('https://wa.me/85291376887?text=' + encodeURIComponent(orderMessage()), '_blank', 'noopener,noreferrer');
    });
    renderCart();

    async function loadProducts() {
        if (catalogLoading) return;
        catalogReady = false;
        const notice = document.getElementById('products-status');
        if (notice) notice.textContent = '正在載入產品…';
        document.getElementById('checkout')?.setAttribute('disabled', '');
        try {
            const config = window.SPA_CONFIG;
            if (window.SPA_PREVIEW) {
                products = window.SPA_PREVIEW.get().filter(product => product.visible)
                    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
                    .map(product => ({...product}));
                catalogReady = true;
                try { cart = validCart(JSON.parse(localStorage.getItem(cartKey))); } catch { cart = validCart(cart); }
                saveCart('');
                renderProducts();
                if (notice) notice.textContent = products.length ? '' : '暫時未有產品，歡迎聯絡店主查詢。';
                return;
            }
            if (!config?.url || !config?.publishableKey) throw new Error('Missing public configuration');
            const loaded = [];
            // Fetch in pages so the API's default row limit cannot silently remove saved cart items.
            for (let offset = 0; ; offset += 1000) {
                const url = new URL('/rest/v1/products', config.url);
                url.search = new URLSearchParams({select: '*', visible: 'eq.true', order: 'sort_order.asc,id.asc', limit: '1000', offset: String(offset)});
                const response = await fetch(url, {headers: {apikey: config.publishableKey}, signal: AbortSignal.timeout(15000), cache: 'no-store'});
                if (!response.ok) throw new Error('Product request failed: ' + response.status);
                const rows = await response.json();
                if (!Array.isArray(rows)) throw new Error('Invalid catalog response');
                loaded.push(...rows);
                if (rows.length < 1000) break;
            }
            if (detail?.open) detail.close();
            products = loaded;
            catalogReady = true;
            try { cart = validCart(JSON.parse(localStorage.getItem(cartKey))); } catch { cart = validCart(cart); }
            saveCart('');
            renderProducts();
            if (notice) notice.textContent = products.length ? '' : '暫時未有產品，歡迎聯絡店主查詢。';
        } catch (error) {
            console.error('Catalog unavailable', error);
            catalogReady = false;
            products = [];
            renderProducts();
            if (detail?.open) detail.close();
            if (notice) notice.textContent = '產品資料暫時未能載入，請稍後再試。';
            const items = document.getElementById('cart-items');
            if (items) items.textContent = '產品資料載入後，即可查看已儲存的購物籃。';
            // Do not overwrite localStorage during an outage.
        } finally { catalogLoading = false; }
    }
    document.getElementById('retry-products')?.addEventListener('click', loadProducts);
    window.addEventListener('pageshow', loadProducts);
    window.addEventListener('storage', event => {
        if (event.key !== cartKey || !catalogReady) return;
        try { cart = validCart(JSON.parse(event.newValue)); } catch { cart = {}; }
        renderCart();
    });
