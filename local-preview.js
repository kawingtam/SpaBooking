(() => {
    const config = window.SPA_CONFIG;
    const localHost = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
    if (!localHost || config?.url && config?.publishableKey) return;

    const key = 'ageless-spa-preview-products';
    const seeds = [
        ['serum-1', '保濕精華（示例）', 'serum', '30 ml', '清透水感質地，作為日常保濕步驟的示例。'],
        ['serum-2', '柔潤精華（示例）', 'serum', '30 ml', '柔潤觸感的晚間護理示例，為日常留一點從容。'],
        ['mask-1', '保濕面膜（示例）', 'mask', '5 片 / 盒', '片裝面膜示例，適合展示每週護理系列。'],
        ['mask-2', '晚安面膜（示例）', 'mask', '5 片 / 盒', '晚間放鬆系列示例，為自己安排一段安靜時間。'],
        ['body-1', '身體護理乳（示例）', 'body', '200 ml', '日常身體護理示例，呈現沐浴後的柔潤儀式。'],
        ['body-2', '香氛沐浴露（示例）', 'body', '250 ml', '溫暖木質調概念示例，讓沐浴成為一天的小休息。']
    ].map(([id, name, category, size, description], sort_order) => ({
        id, name, category, size, short_description: description,
        full_description: description, image_path: null,
        visible: true, sort_order, price: null, image_zoom: 1,
        image_position_x: 50, image_position_y: 50
    }));

    function get() {
        try {
            const saved = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(saved)) return saved;
        } catch {}
        localStorage.setItem(key, JSON.stringify(seeds));
        return structuredClone(seeds);
    }
    function save(products) {
        localStorage.setItem(key, JSON.stringify(products));
    }
    function put(product) {
        const products = get();
        const index = products.findIndex(item => item.id === product.id);
        if (index < 0) products.push(product); else products[index] = product;
        save(products);
    }
    function remove(id) {
        save(get().filter(product => product.id !== id));
    }
    function image(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    window.SPA_PREVIEW = {get, put, remove, image};
})();
