document.addEventListener('DOMContentLoaded', () => {
    // New Page Elements
    const splashScreen = document.getElementById('splash-screen');
    const loginPage = document.getElementById('login-page');
    const loginForm = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');

    // --- App Initialization Flow ---
    let loginShown = false;
    function showLoginPage() {
        if (loginShown) return; // Prevent multiple triggers
        loginShown = true;
        splashScreen.classList.add('fade-out');
        loginPage.classList.remove('hidden');
    }

    splashScreen.addEventListener('click', showLoginPage);
    splashScreen.addEventListener('wheel', (e) => { if (e.deltaY < 0) showLoginPage(); }, { passive: true });
    let touchstartY = 0;
    splashScreen.addEventListener('touchstart', (e) => { touchstartY = e.changedTouches[0].screenY; }, { passive: true });
    splashScreen.addEventListener('touchend', (e) => { if (touchstartY - e.changedTouches[0].screenY > 50) showLoginPage(); }, { passive: true });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('username').value === 'admin' && document.getElementById('password').value === 'password') {
            loginPage.classList.add('fade-out');
            appContainer.classList.remove('hidden');
            initializeApp();
        } else {
            showToast('Invalid credentials. Please try again.');
        }
    });

    // --- Main Application Logic ---
    function initializeApp() {
        const brands = [
            { name: "Rare Rabbit", price: 650, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Rare+Rabbit' }, { name: "Louis Philippe", price: 1200, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Louis+Philippe' }, { name: "Van Heusen", price: 1100, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Van+Heusen' }, { name: "Allen Solly", price: 950, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Allen+Solly' }, { name: "Peter England", price: 800, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Peter+England' }, { name: "Park Avenue", price: 1300, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Park+Avenue' }, { name: "Raymond", price: 1500, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Raymond' }, { name: "Wrangler", price: 1800, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Wrangler' }, { name: "Levi's", price: 2200, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Levi%27s' }, { name: "Mufti", price: 1600, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Mufti' }
        ];

        const productList = document.getElementById('product-list');
        const cartItemsContainer = document.getElementById('cart-items');
        const subtotalEl = document.getElementById('subtotal'), gstEl = document.getElementById('gst'), totalEl = document.getElementById('total');
        const generateBillBtn = document.getElementById('generate-bill-btn');
        const whatsappShareBtn = document.getElementById('whatsapp-share-btn');
        const amountPaidBtn = document.getElementById('amount-paid-btn');
        const searchInput = document.getElementById('search-input');
        const viewCartBtn = document.getElementById('view-cart-btn'), cartModalOverlay = document.getElementById('cart-modal-overlay'), closeModalBtn = document.getElementById('close-modal-btn');
        const cartCountBadge = document.getElementById('cart-count-badge');
        const totalBillsCountEl = document.getElementById('total-bills-count');
        const paymentMethodOptions = document.getElementById('payment-method-options');
        // Side Menu Elements
        const sideMenu = document.getElementById('side-menu'), sideMenuOverlay = document.getElementById('side-menu-overlay');
        const openMenuBtn = document.getElementById('open-menu-btn'), closeMenuBtn = document.getElementById('close-menu-btn');
        const summaryBtn = document.getElementById('summary-btn'), billHistoryBtn = document.getElementById('bill-history-btn'), logoutBtn = document.getElementById('logout-btn');
        // New Modal Elements
        const historyModal = document.getElementById('bill-history-modal'), closeHistoryBtn = document.getElementById('close-history-modal-btn');
        const summaryModal = document.getElementById('summary-modal'), closeSummaryBtn = document.getElementById('close-summary-modal-btn');

        const cartPlaceholderHTML = document.getElementById('cart-placeholder').outerHTML;

        let cart = [];
        const GST_RATE = 0.05;
        let generatedPdfBlob = null;
        let selectedPaymentMethod = 'Cash';
        const todayStr = new Date().toISOString().split('T')[0];

        function loadAndDisplayDailyCount() {
            const savedBills = JSON.parse(localStorage.getItem('dailyBills'));
            let count = 0;
            if (savedBills && savedBills.date === todayStr) {
                count = savedBills.count;
            } else {
                localStorage.setItem('dailyBills', JSON.stringify({ date: todayStr, count: 0 }));
            }
            totalBillsCountEl.textContent = count;
        }

        function updateBillCounter() {
            let savedBills = JSON.parse(localStorage.getItem('dailyBills'));
            if (savedBills && savedBills.date === todayStr) {
                savedBills.count++;
            } else {
                savedBills = { date: todayStr, count: 1 };
            }
            localStorage.setItem('dailyBills', JSON.stringify(savedBills));
            totalBillsCountEl.textContent = savedBills.count;
        }
        
        function saveBillToHistory(billDetails) {
            let history = JSON.parse(localStorage.getItem('billHistory')) || [];
            history.unshift(billDetails); // Add to the beginning
            localStorage.setItem('billHistory', JSON.stringify(history));
        }

        function renderProducts(productsToRender = brands) {
            productList.innerHTML = productsToRender.map((brand, index) => `
                <div class="product-card product-card-animation bg-slate-100 rounded-xl p-4 flex flex-col items-center text-center cursor-pointer transition-all duration-300" data-name="${brand.name}" style="animation-delay: ${index * 50}ms">
                    <img src="${brand.image}" alt="${brand.name}" class="w-full h-40 object-cover rounded-lg mb-3">
                    <h3 class="font-semibold text-lg">${brand.name}</h3>
                    <p class="text-slate-500">₹${brand.price.toFixed(2)}</p>
                </div>`).join('') || `<p class="col-span-full text-center text-slate-500 py-10">No brands found.</p>`;
        }

        function addToCart(productName) {
            const product = brands.find(b => b.name === productName);
            const cartItem = cart.find(item => item.name === productName);
            if (cartItem) {
                cartItem.quantity++;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            updateCart();
            viewCartBtn.classList.add('shake-animation');
            viewCartBtn.addEventListener('animationend', () => viewCartBtn.classList.remove('shake-animation'), { once: true });
        }

        function updateCart() {
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = cartPlaceholderHTML;
                lucide.createIcons();
            } else {
                cartItemsContainer.innerHTML = cart.map(item => `
                    <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg animated fadeInUp">
                        <div class="flex-grow"><p class="font-semibold">${item.name}</p><p class="text-sm text-slate-500">₹${item.price.toFixed(2)}</p></div>
                        <div class="flex items-center gap-2">
                            <button class="quantity-btn p-1 rounded-full bg-slate-200 hover:bg-slate-300" data-name="${item.name}" data-action="decrease">-</button>
                            <span class="w-8 text-center font-medium">${item.quantity}</span>
                            <button class="quantity-btn p-1 rounded-full bg-slate-200 hover:bg-slate-300" data-name="${item.name}" data-action="increase">+</button>
                        </div>
                        <button class="remove-btn ml-3 text-red-500 hover:text-red-700 font-bold text-xl" data-name="${item.name}">&times;</button>
                    </div>`).join('');
            }
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            const oldVal = parseInt(cartCountBadge.textContent) || 0;
            cartCountBadge.textContent = totalItems;
            cartCountBadge.classList.toggle('hidden', totalItems === 0);
            if(totalItems > oldVal) {
                cartCountBadge.classList.add('badge-pop-animation');
                cartCountBadge.addEventListener('animationend', () => cartCountBadge.classList.remove('badge-pop-animation'), { once: true });
            }
            calculateTotals();
            whatsappShareBtn.disabled = true;
            amountPaidBtn.disabled = true;
        }

        function handleCartActions(e) {
            const target = e.target.closest('.quantity-btn, .remove-btn');
            if (!target) return;
            const name = target.dataset.name;
            const item = cart.find(i => i.name === name);
            if (target.matches('.quantity-btn')) {
                if (target.dataset.action === 'increase') item.quantity++;
                else if (target.dataset.action === 'decrease') {
                    item.quantity--;
                    if (item.quantity === 0) cart = cart.filter(i => i.name !== name);
                }
            } else if (target.matches('.remove-btn')) {
                cart = cart.filter(i => i.name !== name);
            }
            updateCart();
        }

        function calculateTotals() {
            const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const gst = subtotal * GST_RATE;
            const total = subtotal + gst;
            subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
            gstEl.textContent = `₹${gst.toFixed(2)}`;
            totalEl.textContent = `₹${total.toFixed(2)}`;
        }

        async function generatePDF() {
            const customerName = document.getElementById('customer-name').value.trim();
            const customerPhone = document.getElementById('customer-phone').value.trim();
            if (cart.length === 0) { showToast("Cart is empty."); return; }
            if (!customerName || !customerPhone) { showToast("Please enter customer details."); return; }
            
            const { jsPDF } = window.jspdf;
            const invNo = `INV${Date.now()}`;
            const billDate = new Date();
            document.getElementById('bill-date').textContent = `Date: ${billDate.toLocaleDateString('en-IN')}`;
            document.getElementById('bill-inv-no').textContent = `Invoice #: ${invNo}`;
            document.getElementById('bill-customer-name').textContent = customerName;
            document.getElementById('bill-customer-phone').textContent = `Phone: ${customerPhone}`;
            document.getElementById('bill-items-table').innerHTML = cart.map(item => `
                <tr><td class="p-3">${item.name}</td><td class="p-3 text-right">₹${item.price.toFixed(2)}</td>
                <td class="p-3 text-center">${item.quantity}</td><td class="p-3 text-right">₹${(item.price * item.quantity).toFixed(2)}</td></tr>`).join('');
            document.getElementById('bill-subtotal').textContent = subtotalEl.textContent;
            document.getElementById('bill-gst').textContent = gstEl.textContent;
            document.getElementById('bill-payment-method').textContent = selectedPaymentMethod;
            document.getElementById('bill-total').textContent = totalEl.textContent;
            
            const billTemplate = document.getElementById('bill-template');
            billTemplate.classList.remove('hidden');
            const canvas = await html2canvas(billTemplate.firstElementChild);
            billTemplate.classList.add('hidden');
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
            generatedPdfBlob = pdf.output('blob');
            pdf.save(`${customerName}_invoice.pdf`);
            
            saveBillToHistory({
                invNo, customerName, date: billDate.toISOString(),
                total: parseFloat(totalEl.textContent.replace('₹', '')),
                method: selectedPaymentMethod
            });
            updateBillCounter();
            
            showToast("PDF generated! You can now send it via WhatsApp.", 'success');
            whatsappShareBtn.disabled = false;
            amountPaidBtn.disabled = false;
        }

        whatsappShareBtn.addEventListener('click', async () => {
            const customerName = document.getElementById('customer-name').value.trim();
            const customerPhone = document.getElementById('customer-phone').value.trim();
            const fileName = `${customerName || 'invoice'}.pdf`;

            if (!generatedPdfBlob) {
                showToast("Please generate the PDF first.", "error");
                return;
            }

            const fileToShare = new File([generatedPdfBlob], fileName, { type: 'application/pdf' });
            const shareData = {
                files: [fileToShare],
                title: 'StyleSphere Boutique Invoice',
                text: `Hello, here is your invoice from StyleSphere Boutique. Total: ${totalEl.textContent}`,
            };
            
            if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                try {
                    await navigator.share(shareData);
                    showToast('Share dialog opened!', 'success');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        showToast(`Error: ${err.message}`, 'error');
                    }
                }
            } else {
                showToast("Please attach the downloaded PDF to the WhatsApp chat.", "info");
                const billSummary = `*Invoice from StyleSphere Boutique!*%0A%0AHello, please find your invoice attached.%0A*Total: ${totalEl.textContent}*%0A%0AThank you for your purchase!`;
                const whatsappUrl = `https://wa.me/${customerPhone}?text=${billSummary}`;
                window.open(whatsappUrl, '_blank');
            }
        });

        function resetForNewBill() {
            cart = [];
            generatedPdfBlob = null;
            document.getElementById('customer-name').value = '';
            document.getElementById('customer-phone').value = '';
            updateCart(); // This will reset UI and disable buttons
            toggleModal(cartModalOverlay, false);
            showToast('Ready for the next customer.', 'success');
        }
        
        function toggleModal(modal, show) {
            const content = modal.querySelector('section');
            if (show) {
                document.body.classList.add('no-scroll');
                modal.classList.remove('hidden');
                setTimeout(() => { modal.classList.add('opacity-100'); content.classList.add('scale-100'); }, 10);
            } else {
                document.body.classList.remove('no-scroll');
                modal.classList.remove('opacity-100'); content.classList.remove('scale-100');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        }

        function closeSideMenu() {
            sideMenu.classList.add('-translate-x-full');
            sideMenuOverlay.classList.add('hidden');
        }

        function renderBillHistory() {
            const history = JSON.parse(localStorage.getItem('billHistory')) || [];
            const tableBody = document.getElementById('bill-history-table-body');
            const placeholder = document.getElementById('history-placeholder');
            if (history.length === 0) {
                tableBody.innerHTML = '';
                placeholder.classList.remove('hidden');
            } else {
                placeholder.classList.add('hidden');
                tableBody.innerHTML = history.map(bill => `
                    <tr class="bg-white border-b hover:bg-slate-50">
                        <td class="px-6 py-4 font-medium text-slate-900">${bill.invNo}</td>
                        <td class="px-6 py-4">${new Date(bill.date).toLocaleString('en-IN')}</td>
                        <td class="px-6 py-4">${bill.customerName}</td>
                        <td class="px-6 py-4">₹${bill.total.toFixed(2)}</td>
                        <td class="px-6 py-4">${bill.method}</td>
                    </tr>`).join('');
            }
            toggleModal(historyModal, true);
        }
        
        function renderTodaySummary() {
            const history = JSON.parse(localStorage.getItem('billHistory')) || [];
            const todaysBills = history.filter(bill => bill.date.startsWith(todayStr));
            
            const totalRevenue = todaysBills.reduce((sum, bill) => sum + bill.total, 0);
            const cashTotal = todaysBills.filter(b => b.method === 'Cash').reduce((s, b) => s + b.total, 0);
            const upiTotal = todaysBills.filter(b => b.method === 'UPI').reduce((s, b) => s + b.total, 0);
            const cardTotal = todaysBills.filter(b => b.method === 'Card').reduce((s, b) => s + b.total, 0);
            
            document.getElementById('summary-total-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
            document.getElementById('summary-total-bills').textContent = todaysBills.length;
            document.getElementById('summary-cash').textContent = `₹${cashTotal.toFixed(2)}`;
            document.getElementById('summary-upi').textContent = `₹${upiTotal.toFixed(2)}`;
            document.getElementById('summary-card').textContent = `₹${cardTotal.toFixed(2)}`;

            toggleModal(summaryModal, true);
        }

        // Event Listeners
        productList.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (card) {
                addToCart(card.dataset.name);
            }
        });
        cartItemsContainer.addEventListener('click', handleCartActions);
        searchInput.addEventListener('input', (e) => renderProducts(brands.filter(b => b.name.toLowerCase().includes(e.target.value.toLowerCase()))));
        viewCartBtn.addEventListener('click', () => toggleModal(cartModalOverlay, true));
        closeModalBtn.addEventListener('click', () => toggleModal(cartModalOverlay, false));
        cartModalOverlay.addEventListener('click', (e) => e.target === cartModalOverlay && toggleModal(cartModalOverlay, false));
        paymentMethodOptions.addEventListener('click', (e) => {
            const button = e.target.closest('.payment-method-btn');
            if (!button) return;
            selectedPaymentMethod = button.dataset.method;
            document.querySelectorAll('.payment-method-btn').forEach(btn => {
                btn.classList.remove('selected', 'border-indigo-600', 'bg-indigo-100', 'text-indigo-700');
                btn.classList.add('btn-secondary', 'border-transparent');
            });
            button.classList.add('selected', 'border-indigo-600', 'bg-indigo-100', 'text-indigo-700');
            button.classList.remove('btn-secondary', 'border-transparent');
            lucide.createIcons();
        });
        generateBillBtn.addEventListener('click', generatePDF);
        amountPaidBtn.addEventListener('click', resetForNewBill);
        
        openMenuBtn.addEventListener('click', () => { sideMenu.classList.remove('-translate-x-full'); sideMenuOverlay.classList.remove('hidden'); });
        closeMenuBtn.addEventListener('click', closeSideMenu);
        sideMenuOverlay.addEventListener('click', closeSideMenu);
        logoutBtn.addEventListener('click', () => window.location.reload());
        
        billHistoryBtn.addEventListener('click', () => {
            closeSideMenu();
            setTimeout(renderBillHistory, 300); // Delay to allow menu to close
        });
        summaryBtn.addEventListener('click', () => {
            closeSideMenu();
            setTimeout(renderTodaySummary, 300);
        });

        closeHistoryBtn.addEventListener('click', () => toggleModal(historyModal, false));
        closeSummaryBtn.addEventListener('click', () => toggleModal(summaryModal, false));
        
        // Initial Render
        loadAndDisplayDailyCount();
        renderProducts();
        updateCart();
    }

    // --- Utility Functions ---
    let toastTimeout;
    function showToast(message, type = 'error') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        clearTimeout(toastTimeout);

        toastMessage.textContent = message;
        
        const baseClasses = "fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg z-[130] transition-all duration-300";
        const typeClass = type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500';
        
        toast.className = `${baseClasses} ${typeClass} opacity-100 translate-x-0`;

        toastTimeout = setTimeout(() => {
            toast.className = `${baseClasses} ${typeClass} opacity-0 translate-x-full`;
        }, 3000);
    }

    lucide.createIcons();
});
