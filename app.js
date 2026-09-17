
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

    // Replace these placeholders with real products; keep IDs stable for saved baskets.
    const products = [
        { id: 'serum-1', category: 'serum', name: '保濕精華（示例）', size: '30 ml', description: '清透水感質地，作為日常保濕步驟的示例。', label: 'HYDRATE', color: '#ddc19e', paper: '#ecddc8' },
        { id: 'serum-2', category: 'serum', name: '柔潤精華（示例）', size: '30 ml', description: '柔潤觸感的晚間護理示例，為日常留一點從容。', label: 'SOFTEN', color: '#deb4ad', paper: '#efdbd8' },
        { id: 'mask-1', category: 'mask', name: '保濕面膜（示例）', size: '5 片 / 盒', description: '片裝面膜示例，適合展示每週護理系列。', label: 'DEW MASK', color: '#c5d0bf', paper: '#e0e6d9' },
        { id: 'mask-2', category: 'mask', name: '晚安面膜（示例）', size: '5 片 / 盒', description: '晚間放鬆系列示例，為自己安排一段安靜時間。', label: 'NIGHT MASK', color: '#cfc3d6', paper: '#e5dfea' },
        { id: 'body-1', category: 'body', name: '身體護理乳（示例）', size: '200 ml', description: '日常身體護理示例，呈現沐浴後的柔潤儀式。', label: 'BODY MILK', color: '#e5d7bb', paper: '#eee5d5' },
        { id: 'body-2', category: 'body', name: '香氛沐浴露（示例）', size: '250 ml', description: '溫暖木質調概念示例，讓沐浴成為一天的小休息。', label: 'BODY WASH', color: '#c7b29a', paper: '#e5dbce' }
    ];
    const cartKey = 'ageless-spa-cart';
    const status = document.getElementById('cart-status');
    let cart = {};
    function validCart(value) {
        return Object.fromEntries(products.filter(p => Number.isInteger(value?.[p.id]) && value[p.id] > 0 && value[p.id] <= 99)
            .map(p => [p.id, value[p.id]]));
    }
    try { cart = validCart(JSON.parse(localStorage.getItem(cartKey))); } catch {}
    function orderMessage() {
        return ['你好，我想查詢以下產品：', ...products.filter(p => cart[p.id]).map(p => `${p.name} × ${cart[p.id]}`),
            '', '請確認價格、庫存及付款 / 取貨或送貨方式，謝謝！'].join('\n');
    }
    function saveCart(message) {
        try {
            localStorage.setItem(cartKey, JSON.stringify(cart));
            status.textContent = message;
        } catch {
            status.textContent = message + ' 此瀏覽器未能儲存購物籃，重新整理後可能遺失。';
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
        document.getElementById('checkout').disabled = !count;
    }
    for (const product of document.getElementById('products') ? products : []) {
        const card = document.createElement('article');
        card.className = 'service-card product-card';
        const art = document.createElement('div');
        art.className = 'product-art ' + product.category;
        art.setAttribute('aria-hidden', 'true');
        art.style.setProperty('--paper', product.paper);
        art.style.setProperty('--bottle', product.color);
        const pack = document.createElement('div'); pack.className = 'product-pack';
        const brand = document.createElement('b'); brand.textContent = 'AGELESS';
        const label = document.createElement('small'); label.textContent = product.label;
        pack.append(brand, label); art.append(pack);
        const name = document.createElement('h4'); name.textContent = product.name;
        const note = document.createElement('p'); note.textContent = product.description;
        const size = document.createElement('p'); size.textContent = product.size + ' · 示例包裝 · 價格請洽店主';
        const add = document.createElement('button');
        add.type = 'button'; add.className = 'btn'; add.textContent = '加入購物籃';
        add.setAttribute('aria-label', '加入購物籃：' + product.name);
        add.addEventListener('click', () => {
            cart[product.id] = Math.min(99, (cart[product.id] || 0) + 1);
            saveCart('已加入' + product.name + '。');
            add.textContent = '已加入 · 繼續加入';
        });
        card.append(art, name, size, note, add);
        document.querySelector('#category-' + product.category + ' .services-grid').append(card);
    }
    document.getElementById('checkout')?.addEventListener('click', () => {
        if (!Object.keys(cart).length) return;
        window.open('https://wa.me/85291376887?text=' + encodeURIComponent(orderMessage()), '_blank', 'noopener,noreferrer');
    });
    renderCart();

    window.addEventListener('pageshow', () => {
        try { cart = validCart(JSON.parse(localStorage.getItem(cartKey))); } catch {}
        renderCart();
    });
