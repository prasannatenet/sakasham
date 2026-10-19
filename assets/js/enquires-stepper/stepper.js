(() => {
    const wizard = document.querySelector('[data-enquiry-wizard]');
    if (!wizard) return;

    const panel = wizard.querySelector('[data-step-panel]');
    const title = wizard.querySelector('[data-step-title]');
    const description = wizard.querySelector('[data-step-description]');
    const feedback = wizard.querySelector('[data-enquiry-feedback]');
    const addressSummary = wizard.querySelector('[data-address-summary]');
    const steps = [...wizard.querySelectorAll('[data-step-target]')];
    const params = new URLSearchParams(window.location.search);
    const selectedItems = new Map();
    let activeCategory = 'all';
    let searchTerm = '';
    let currentStep = 2;
    let furthestStep = 2;
    let selectedVehicle = '';

    const itemCategories = [
        { id: 'all', label: 'All items', icon: 'fa-border-all' },
        { id: 'furniture', label: 'Furniture', icon: 'fa-couch' },
        { id: 'appliances', label: 'Home appliances', icon: 'fa-blender' },
        { id: 'electronics', label: 'Electronics', icon: 'fa-tv' },
        { id: 'other', label: 'Other items', icon: 'fa-box' }
    ];

    const items = [
        { id: 'sofa-3', name: 'Sofa (3 Seater)', category: 'furniture', price: 300, icon: 'fa-couch' },
        { id: 'sofa-2', name: 'Sofa (2 Seater)', category: 'furniture', price: 200, icon: 'fa-couch' },
        { id: 'sofa-1', name: 'Sofa (1 Seater)', category: 'furniture', price: 150, icon: 'fa-couch' },
        { id: 'chair', name: 'Chair', category: 'furniture', price: 80, icon: 'fa-chair' },
        { id: 'bed', name: 'Bed', category: 'furniture', price: 350, icon: 'fa-bed' },
        { id: 'wardrobe', name: 'Wardrobe', category: 'furniture', price: 300, icon: 'fa-door-closed' },
        { id: 'dining-table', name: 'Dining Table', category: 'furniture', price: 250, icon: 'fa-utensils' },
        { id: 'fridge', name: 'Refrigerator', category: 'appliances', price: 250, icon: 'fa-temperature-low' },
        { id: 'washing-machine', name: 'Washing Machine', category: 'appliances', price: 200, icon: 'fa-soap' },
        { id: 'air-conditioner', name: 'Air Conditioner', category: 'appliances', price: 200, icon: 'fa-fan' },
        { id: 'microwave', name: 'Microwave', category: 'appliances', price: 100, icon: 'fa-fire-burner' },
        { id: 'television', name: 'Television', category: 'electronics', price: 150, icon: 'fa-tv' },
        { id: 'computer', name: 'Computer', category: 'electronics', price: 150, icon: 'fa-computer' },
        { id: 'carton', name: 'Carton Boxes', category: 'other', price: 50, icon: 'fa-box-open' },
        { id: 'plant', name: 'Plant Pots', category: 'other', price: 60, icon: 'fa-seedling' }
    ];

    const vehicles = [
        { id: 'mini-truck', name: 'Tata Ace (Chhota Hathi)', type: 'Mini truck', capacity: 'Up to 1,000 kg', icon: 'fa-truck-pickup' },
        { id: '407-truck', name: 'Tata 407', type: 'Truck', capacity: 'Up to 5,000 kg', icon: 'fa-truck' },
        { id: 'large-truck', name: 'Large Truck', type: 'Large truck', capacity: 'For larger household moves', icon: 'fa-truck-moving' }
    ];

    const getParam = (...names) => {
        for (const name of names) {
            const value = params.get(name)?.trim();
            if (value) return value;
        }
        return '';
    };

    const route = {
        pickupCity: getParam('pickupCity', 'pickup_city', 'sourceCity', 'fromCity', 'city', 'location'),
        pickupAddress: getParam('pickupAddress', 'pickup_address', 'fromAddress', 'from_address', 'pickup', 'from', 'address'),
        dropCity: getParam('dropCity', 'drop_city', 'destinationCity', 'toCity'),
        dropAddress: getParam('dropAddress', 'drop_address', 'toAddress', 'to_address', 'drop', 'to'),
        pickupMap: getParam('pickupMap', 'pickup_map', 'fromMap', 'from_map'),
        dropMap: getParam('dropMap', 'drop_map', 'toMap', 'to_map'),
        pickupDate: getParam('pickupDate', 'pickup_date', 'movingDate', 'date'),
        pickupTime: getParam('pickupTime', 'pickup_time'),
        name: getParam('name', 'fullName', 'full_name'),
        email: getParam('email'),
        phone: getParam('phone', 'mobile', 'mobileNumber', 'mobile_number')
    };

    const currency = amount => `₹${amount.toLocaleString('en-IN')}.00`;
    const getTotal = () => [...selectedItems].reduce((total, [id, quantity]) => {
        const item = items.find(entry => entry.id === id);
        return total + (item ? item.price * quantity : 0);
    }, 0);

    const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);

    function showAddressSummary() {
        const parts = [
            route.pickupAddress && `From: ${route.pickupAddress}`,
            route.dropAddress && `To: ${route.dropAddress}`
        ].filter(Boolean);

        if (!parts.length && !route.pickupCity && !route.dropCity) {
            addressSummary.hidden = true;
            return;
        }

        const places = [
            route.pickupCity && `Pickup city: ${route.pickupCity}`,
            route.dropCity && `Drop city: ${route.dropCity}`
        ].filter(Boolean);
        addressSummary.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            <span><strong>Address received</strong>${places.length ? ` · ${places.map(escapeHTML).join(' · ')}` : ''}
            ${parts.length ? `<br>${parts.map(escapeHTML).join(' &nbsp;→&nbsp; ')}` : ''}</span>`;
    }

    function updateStepper() {
        steps.forEach((step, index) => {
            const stepNumber = Number(step.dataset.stepTarget);
            const complete = stepNumber === 1 || stepNumber < currentStep;
            const active = stepNumber === currentStep;
            step.classList.toggle('is-complete', complete);
            step.classList.toggle('is-active', active);
            step.disabled = stepNumber === 1 || stepNumber > furthestStep;

            if (active) {
                step.setAttribute('aria-current', 'step');
                step.querySelector('.enquiry-step-number').textContent = String(stepNumber);
            } else {
                step.removeAttribute('aria-current');
                step.querySelector('.enquiry-step-number').innerHTML = complete && stepNumber !== 1
                    ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
                    : String(stepNumber);
            }

            const line = step.nextElementSibling;
            if (line?.classList.contains('enquiry-step-line')) {
                line.classList.toggle('is-complete', stepNumber < currentStep);
            }
        });
    }

    function renderCategories() {
        return `<nav class="enquiry-category-list" aria-label="Item categories">
            ${itemCategories.map(category => `<button class="enquiry-category-button${activeCategory === category.id ? ' is-selected' : ''}"
                type="button" data-category="${category.id}" aria-pressed="${activeCategory === category.id}">
                <i class="fa-solid ${category.icon}" aria-hidden="true"></i>${category.label}
            </button>`).join('')}
        </nav>`;
    }

    function renderItemCards() {
        const visibleItems = items.filter(item => {
            const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        if (!visibleItems.length) {
            return '<p class="enquiry-empty-state">No items found. Try another search.</p>';
        }

        return visibleItems.map(item => {
            const selected = selectedItems.has(item.id);
            return `<button class="enquiry-item-card${selected ? ' is-selected' : ''}" type="button"
                data-item="${item.id}" aria-pressed="${selected}">
                <span class="enquiry-item-check"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
                <i class="enquiry-item-icon fa-solid ${item.icon}" aria-hidden="true"></i>
                <span class="enquiry-item-name">${item.name}</span>
                <span class="enquiry-item-price">${currency(item.price)} each</span>
            </button>`;
        }).join('');
    }

    function renderSelectedItems() {
        const selected = [...selectedItems].map(([id, quantity]) => ({
            ...items.find(item => item.id === id),
            quantity
        }));

        return `<aside class="enquiry-selected-card" aria-label="Selected items and estimate">
            <div class="enquiry-selected-header">
                <h3>Selected items</h3>
                <span class="enquiry-selected-count">${selected.length}</span>
            </div>
            <div class="enquiry-selected-list">
                ${selected.length ? selected.map(item => `<div class="enquiry-selected-item" data-selected-item="${item.id}">
                    <div>
                        <div class="enquiry-selected-item-name">${item.name}</div>
                        <div class="enquiry-selected-item-price">${currency(item.price)} each · ${currency(item.price * item.quantity)}</div>
                    </div>
                    <div class="enquiry-quantity" aria-label="${item.name} quantity">
                        <button type="button" data-quantity-change="-1" aria-label="Remove one ${item.name}">−</button>
                        <output>${item.quantity}</output>
                        <button type="button" data-quantity-change="1" aria-label="Add one ${item.name}">+</button>
                    </div>
                    <button class="enquiry-remove-item" type="button" data-remove-item aria-label="Remove ${item.name}">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>`).join('') : '<div class="enquiry-selected-empty">Choose the items you are moving to see them here.</div>'}
            </div>
            <div class="enquiry-estimate"><span>Estimated total</span><strong>${currency(getTotal())}</strong></div>
        </aside>`;
    }

    function renderStepActions({ back = false, nextLabel = 'Next', skipLabel = 'Skip', nextDisabled = false } = {}) {
        return `<div class="enquiry-step-actions">
            ${back ? '<button class="enquiry-button enquiry-button--secondary" type="button" data-action="back"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button>' : ''}
            <button class="enquiry-button" type="button" data-action="next"${nextDisabled ? ' disabled' : ''}>${nextLabel} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            <button class="enquiry-button enquiry-button--secondary" type="button" data-action="skip">${skipLabel}</button>
        </div>`;
    }

    function renderItemsStep() {
        panel.innerHTML = `<div class="enquiry-items-layout">
            ${renderCategories()}
            <div class="enquiry-item-section">
                <div class="enquiry-item-section-heading">
                    <h3>Select items</h3>
                    <label class="enquiry-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                        <input type="search" data-item-search placeholder="Search items" aria-label="Search items">
                    </label>
                </div>
                <div class="enquiry-item-grid">${renderItemCards()}</div>
            </div>
            ${renderSelectedItems()}
        </div>
        ${renderStepActions({ nextDisabled: selectedItems.size === 0 })}`;

        const searchInput = panel.querySelector('[data-item-search]');
        searchInput.value = searchTerm;
    }

    function renderVehicleStep() {
        panel.innerHTML = `<div class="enquiry-vehicle-grid">
            ${vehicles.map(vehicle => `<button class="enquiry-vehicle-card${selectedVehicle === vehicle.id ? ' is-selected' : ''}"
                type="button" data-vehicle="${vehicle.id}" aria-pressed="${selectedVehicle === vehicle.id}">
                <span class="enquiry-vehicle-visual"><i class="fa-solid ${vehicle.icon}" aria-hidden="true"></i></span>
                <span class="enquiry-vehicle-info"><strong>${vehicle.name}</strong>
                    <span>${vehicle.type} · ${vehicle.capacity}</span></span>
            </button>`).join('')}
        </div>
        ${renderStepActions({ back: true, nextDisabled: !selectedVehicle })}`;
    }

    function renderInformationStep() {
        const today = new Date();
        const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        panel.innerHTML = `<form class="enquiry-form" data-enquiry-form>
            <div class="enquiry-form-card">
                <section class="enquiry-form-section">
                    <h3><i class="fa-regular fa-user" aria-hidden="true"></i> Your details</h3>
                    <div class="enquiry-form-grid">
                        <label class="enquiry-field"><span class="enquiry-field-label">Full name <span>*</span></span>
                            <input name="name" type="text" autocomplete="name" placeholder="Your full name" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Email <span>*</span></span>
                            <input name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Mobile number <span>*</span></span>
                            <input name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="[+0-9()\\s-]{8,18}" placeholder="+91 98765 43210" required>
                        </label>
                    </div>
                </section>
                <section class="enquiry-form-section">
                    <h3><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Pickup location</h3>
                    <div class="enquiry-form-grid">
                        <label class="enquiry-field"><span class="enquiry-field-label">City <span>*</span></span>
                            <input name="pickupCity" autocomplete="address-level2" placeholder="Pickup city" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Google Maps link</span>
                            <input name="pickupMap" type="url" placeholder="https://maps.google.com/...">
                        </label>
                        <label class="enquiry-field enquiry-field--full"><span class="enquiry-field-label">Pickup address <span>*</span></span>
                            <textarea name="pickupAddress" autocomplete="street-address" placeholder="House, street, area" required></textarea>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Pickup date <span>*</span></span>
                            <input name="pickupDate" type="date" min="${minDate}" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Pickup time</span>
                            <input name="pickupTime" type="time">
                        </label>
                    </div>
                </section>
                <section class="enquiry-form-section">
                    <h3><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Drop location</h3>
                    <div class="enquiry-form-grid">
                        <label class="enquiry-field"><span class="enquiry-field-label">City <span>*</span></span>
                            <input name="dropCity" autocomplete="address-level2" placeholder="Drop city" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Google Maps link</span>
                            <input name="dropMap" type="url" placeholder="https://maps.google.com/...">
                        </label>
                        <label class="enquiry-field enquiry-field--full"><span class="enquiry-field-label">Drop address <span>*</span></span>
                            <textarea name="dropAddress" placeholder="House, street, area" required></textarea>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Drop date</span>
                            <input name="dropDate" type="date" min="${minDate}">
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Drop time</span>
                            <input name="dropTime" type="time">
                        </label>
                    </div>
                </section>
                <p class="enquiry-submit-note">Continue to WhatsApp to send your move details to our team.</p>
            </div>
            <div class="enquiry-step-actions">
                <button class="enquiry-button enquiry-button--secondary" type="button" data-action="back">
                    <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back
                </button>
                <button class="enquiry-button" type="submit">Confirm move request <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            </div>
        </form>`;

        const form = panel.querySelector('[data-enquiry-form]');
        Object.entries(route).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (field && value) field.value = value;
        });
    }

    function renderStep() {
        feedback.textContent = '';
        updateStepper();

        if (currentStep === 2) {
            title.textContent = 'Select items for your move';
            description.textContent = 'Choose the items you’re moving. You can select multiple items and adjust quantities before continuing.';
            renderItemsStep();
        } else if (currentStep === 3) {
            title.textContent = 'Choose your vehicle';
            description.textContent = 'Select a vehicle preference for your move. Our team will confirm the best fit when preparing your quote.';
            renderVehicleStep();
        } else {
            title.textContent = 'Complete your move details';
            description.textContent = 'Your address has been added. Add your contact and move details so our team can prepare an accurate estimate.';
            renderInformationStep();
        }
    }

    function goToStep(step) {
        if (step < 2 || step > furthestStep || step > 4) return;
        currentStep = step;
        renderStep();
        wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateSelectedItem(id, change) {
        const quantity = (selectedItems.get(id) || 0) + change;
        if (quantity <= 0) selectedItems.delete(id);
        else selectedItems.set(id, quantity);
    }

    function handleNext() {
        if (currentStep === 2 && selectedItems.size === 0) {
            feedback.textContent = 'Select at least one item, or choose Skip to continue.';
            return;
        }
        if (currentStep === 3 && !selectedVehicle) {
            feedback.textContent = 'Select a vehicle, or choose Skip to continue.';
            return;
        }
        furthestStep = Math.max(furthestStep, currentStep + 1);
        goToStep(currentStep + 1);
    }

    function submitRequest(form) {
        const formData = new FormData(form);
        const details = Object.fromEntries(formData.entries());
        const selected = [...selectedItems].map(([id, quantity]) => {
            const item = items.find(entry => entry.id === id);
            return `${item.name} x ${quantity}`;
        });
        const vehicle = vehicles.find(entry => entry.id === selectedVehicle);
        const lines = [
            'Move enquiry from Saksham Packers & Movers',
            `Name: ${details.name}`,
            `Email: ${details.email}`,
            `Phone: ${details.phone}`,
            `Pickup: ${details.pickupAddress}, ${details.pickupCity}`,
            details.pickupMap && `Pickup map: ${details.pickupMap}`,
            `Pickup date/time: ${details.pickupDate} ${details.pickupTime || ''}`,
            `Drop: ${details.dropAddress}, ${details.dropCity}`,
            details.dropMap && `Drop map: ${details.dropMap}`,
            details.dropDate && `Drop date/time: ${details.dropDate} ${details.dropTime || ''}`,
            selected.length && `Items: ${selected.join(', ')}`,
            `Estimated item cost: ${currency(getTotal())}`,
            `Vehicle preference: ${vehicle ? vehicle.name : 'No preference'}`
        ].filter(Boolean);
        const whatsappUrl = `https://wa.me/918000283480?text=${encodeURIComponent(lines.join('\n'))}`;
        window.location.assign(whatsappUrl);
    }

    wizard.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target || !wizard.contains(target)) return;

        if (target.matches('[data-step-target]')) {
            goToStep(Number(target.dataset.stepTarget));
            return;
        }

        if (target.matches('[data-category]')) {
            activeCategory = target.dataset.category;
            renderItemsStep();
            return;
        }

        if (target.matches('[data-item]')) {
            const id = target.dataset.item;
            if (selectedItems.has(id)) selectedItems.delete(id);
            else selectedItems.set(id, 1);
            renderItemsStep();
            return;
        }

        if (target.matches('[data-quantity-change]')) {
            const item = target.closest('[data-selected-item]');
            updateSelectedItem(item.dataset.selectedItem, Number(target.dataset.quantityChange));
            renderItemsStep();
            return;
        }

        if (target.matches('[data-remove-item]')) {
            selectedItems.delete(target.closest('[data-selected-item]').dataset.selectedItem);
            renderItemsStep();
            return;
        }

        if (target.matches('[data-vehicle]')) {
            selectedVehicle = selectedVehicle === target.dataset.vehicle ? '' : target.dataset.vehicle;
            renderVehicleStep();
            return;
        }

        if (target.matches('[data-action="back"]')) {
            goToStep(currentStep - 1);
            return;
        }

        if (target.matches('[data-action="next"]')) {
            handleNext();
            return;
        }

        if (target.matches('[data-action="skip"]')) {
            furthestStep = Math.max(furthestStep, currentStep + 1);
            goToStep(currentStep + 1);
        }
    });

    wizard.addEventListener('input', event => {
        if (!event.target.matches('[data-item-search]')) return;
        const cursorPosition = event.target.selectionStart;
        searchTerm = event.target.value.trim().toLowerCase();
        renderItemsStep();
        const searchInput = panel.querySelector('[data-item-search]');
        searchInput.focus();
        searchInput.setSelectionRange(cursorPosition, cursorPosition);
    });

    wizard.addEventListener('submit', event => {
        if (!event.target.matches('[data-enquiry-form]')) return;
        event.preventDefault();
        if (!event.target.reportValidity()) return;
        submitRequest(event.target);
    });

    showAddressSummary();
    renderStep();
})();
