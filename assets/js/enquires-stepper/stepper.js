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
    const apiBase = 'https://crm.sakshampackersandmovers.com/api';
    let itemCategories = [];
    let items = [];
    let vehicles = [];
    let itemCatalogState = 'loading';
    let vehicleCatalogState = 'loading';
    let itemCatalogError = '';
    let vehicleCatalogError = '';
    let catalogRequestActive = false;
    const suggestionTimers = new WeakMap();
    const suggestionControllers = new WeakMap();
    let savedEnquiry = null;
    let savedMoveDetails = {};

    try {
        const storedEnquiry = sessionStorage.getItem('sakshamMoveEnquiry');
        if (storedEnquiry) {
            const parsedEnquiry = JSON.parse(storedEnquiry);
            if (parsedEnquiry && typeof parsedEnquiry === 'object' && !Array.isArray(parsedEnquiry)) {
                savedEnquiry = parsedEnquiry;
                if (parsedEnquiry.details && typeof parsedEnquiry.details === 'object' && !Array.isArray(parsedEnquiry.details)) {
                    savedMoveDetails = parsedEnquiry.details;
                }
            }
        }
    } catch (error) {
        console.error('Unable to read the submitted enquiry details:', error);
    }

    const getParam = (...names) => {
        for (const name of names) {
            const value = params.get(name)?.trim();
            if (value) return value;
        }
        return '';
    };

    const route = {
        enquiryId: getParam('enquiryId') || savedEnquiry?.id || '',
        bookingToken: savedEnquiry?.bookingToken || '',
        pickupCity: savedEnquiry?.pickup_city || getParam('pickupCity', 'pickup_city', 'sourceCity', 'fromCity', 'city', 'location'),
        pickupAddress: getParam('pickupAddress', 'pickup_address', 'fromAddress', 'from_address', 'pickup', 'from', 'address'),
        dropCity: savedEnquiry?.drop_city || getParam('dropCity', 'drop_city', 'destinationCity', 'toCity'),
        dropAddress: getParam('dropAddress', 'drop_address', 'toAddress', 'to_address', 'drop', 'to'),
        pickupMap: getParam('pickupMap', 'pickup_map', 'fromMap', 'from_map'),
        dropMap: getParam('dropMap', 'drop_map', 'toMap', 'to_map'),
        pickupDate: savedEnquiry?.preferred_date || getParam('pickupDate', 'pickup_date', 'movingDate', 'date'),
        pickupTime: getParam('pickupTime', 'pickup_time'),
        name: savedEnquiry?.name || getParam('name', 'fullName', 'full_name'),
        email: getParam('email'),
        phone: savedEnquiry?.mobile || getParam('phone', 'mobile', 'mobileNumber', 'mobile_number')
    };

    const currency = paise => `₹${(paise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    const getTotal = () => [...selectedItems].reduce((total, [id, quantity]) => {
        const item = items.find(entry => entry.id === id);
        return total + (item ? item.pricePaise * quantity : 0);
    }, 0);

    const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
    const validPrice = price => price !== null && price !== undefined && price !== ''
        && Number.isFinite(Number(price)) && Number(price) >= 0;

    async function getCatalog(path) {
        const response = await fetch(`${apiBase}${path}`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`Catalog request returned HTTP ${response.status}.`);
        }

        const result = await response.json();
        if (!Array.isArray(result.data)) {
            throw new Error('Catalog response did not include a data list.');
        }
        return result.data;
    }

    async function loadCatalogs() {
        if (catalogRequestActive) return;
        catalogRequestActive = true;
        itemCatalogState = 'loading';
        vehicleCatalogState = 'loading';
        itemCatalogError = '';
        vehicleCatalogError = '';
        if (currentStep === 2 || currentStep === 3) renderStep();

        const [itemResult, vehicleResult] = await Promise.allSettled([
            getCatalog('/enquiries/items'),
            getCatalog('/enquiries/vehicles')
        ]);

        if (itemResult.status === 'fulfilled') {
            try {
                itemCategories = itemResult.value.map(category => ({
                    id: String(category.id),
                    label: String(category.name),
                    icon: 'fa-box'
                }));
                items = itemResult.value.flatMap(category => {
                    if (!Array.isArray(category.items)) {
                        throw new Error('Item catalog category did not include an items list.');
                    }

                    return category.items.flatMap(item => {
                        const categoryId = String(category.id);
                        const itemName = String(item.name);
                        const basePrice = Number(item.price_paise);
                        const unit = typeof item.unit === 'string' ? item.unit : 'item';
                        const variations = Array.isArray(item.variations) ? item.variations : [];

                        if (!validPrice(basePrice)) {
                            throw new Error(`Item "${itemName}" has an invalid price.`);
                        }

                        if (!variations.length) {
                            return [{
                                id: String(item.id),
                                itemId: Number(item.id),
                                variationId: null,
                                name: itemName,
                                category: categoryId,
                                pricePaise: basePrice,
                                unit
                            }];
                        }

                        return variations.map(variation => {
                            const price = variation.price_paise == null
                                ? basePrice
                                : Number(variation.price_paise);
                            if (!validPrice(price)) {
                                throw new Error(`Variation "${variation.name}" has an invalid price.`);
                            }
                            return {
                                id: `${item.id}:${variation.id}`,
                                itemId: Number(item.id),
                                variationId: Number(variation.id),
                                name: `${itemName} - ${String(variation.name)}`,
                                category: categoryId,
                                pricePaise: price,
                                unit
                            };
                        });
                    });
                });
                const validItemIds = new Set(items.map(item => item.id));
                selectedItems.forEach((quantity, id) => {
                    if (!validItemIds.has(id)) selectedItems.delete(id);
                });
                itemCatalogState = 'ready';
            } catch (error) {
                itemCatalogState = 'error';
                itemCatalogError = error.message || 'The moving-item catalog data is invalid.';
                console.error('Invalid moving-item catalog:', error);
            }
        } else {
            itemCatalogState = 'error';
            itemCatalogError = itemResult.reason.message || 'Unable to load the moving-item catalog.';
            console.error('Unable to load moving items:', itemResult.reason);
        }

        if (vehicleResult.status === 'fulfilled') {
            try {
                vehicles = vehicleResult.value.map(vehicle => {
                    if (!vehicle || vehicle.id == null || typeof vehicle.name !== 'string') {
                        throw new Error('Vehicle catalog contains an invalid vehicle.');
                    }
                    return {
                        id: String(vehicle.id),
                        name: vehicle.name,
                        type: typeof vehicle.type === 'string' ? vehicle.type : '',
                        payloadKg: vehicle.payload_kg != null && Number.isFinite(Number(vehicle.payload_kg))
                            ? Number(vehicle.payload_kg)
                            : null,
                        dimensions: vehicle.dimensions_cm && typeof vehicle.dimensions_cm === 'object'
                            ? vehicle.dimensions_cm
                            : null,
                        basePricePaise: validPrice(vehicle.base_price_paise) ? Number(vehicle.base_price_paise) : null,
                        pricePerKmPaise: validPrice(vehicle.price_per_km_paise) ? Number(vehicle.price_per_km_paise) : null
                    };
                });
                vehicleCatalogState = 'ready';
            } catch (error) {
                vehicleCatalogState = 'error';
                vehicleCatalogError = error.message || 'The vehicle catalog data is invalid.';
                console.error('Invalid vehicle catalog:', error);
            }
        } else {
            vehicleCatalogState = 'error';
            vehicleCatalogError = vehicleResult.reason.message || 'Unable to load the vehicle catalog.';
            console.error('Unable to load vehicles:', vehicleResult.reason);
        }

        catalogRequestActive = false;
        renderStep();
    }

    function showAddressSummary() {
        const parts = [
            route.pickupAddress && `From: ${route.pickupAddress}`,
            route.dropAddress && `To: ${route.dropAddress}`
        ].filter(Boolean);

        if (!parts.length && !route.pickupCity && !route.dropCity && !route.enquiryId) {
            addressSummary.hidden = true;
            return;
        }

        const places = [
            route.pickupCity && `Pickup city: ${route.pickupCity}`,
            route.dropCity && `Drop city: ${route.dropCity}`
        ].filter(Boolean);
        addressSummary.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i>
            <span><strong>Initial move request received</strong>${places.length ? ` · ${places.map(escapeHTML).join(' · ')}` : ''}
            ${route.enquiryId ? `<br>Enquiry reference: ${escapeHTML(route.enquiryId)}` : ''}
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
        const categories = [{ id: 'all', label: 'All items', icon: 'fa-border-all' }, ...itemCategories];
        return `<nav class="enquiry-category-list" aria-label="Item categories">
            ${categories.map(category => `<button class="enquiry-category-button${activeCategory === category.id ? ' is-selected' : ''}"
                type="button" data-category="${escapeHTML(category.id)}" aria-pressed="${activeCategory === category.id}">
                <i class="fa-solid ${category.icon}" aria-hidden="true"></i>${escapeHTML(category.label)}
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
                data-item="${escapeHTML(item.id)}" aria-pressed="${selected}">
                <span class="enquiry-item-check"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
                <i class="enquiry-item-icon fa-solid fa-box" aria-hidden="true"></i>
                <span class="enquiry-item-name">${escapeHTML(item.name)}</span>
                <span class="enquiry-item-price">${currency(item.pricePaise)} / ${escapeHTML(item.unit)}</span>
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
                ${selected.length ? selected.map(item => `<div class="enquiry-selected-item" data-selected-item="${escapeHTML(item.id)}">
                    <div>
                        <div class="enquiry-selected-item-name">${escapeHTML(item.name)}</div>
                        <div class="enquiry-selected-item-price">${currency(item.pricePaise)} / ${escapeHTML(item.unit)} · ${currency(item.pricePaise * item.quantity)}</div>
                    </div>
                    <div class="enquiry-quantity" aria-label="${escapeHTML(item.name)} quantity">
                        <button type="button" data-quantity-change="-1" aria-label="Remove one ${escapeHTML(item.name)}">−</button>
                        <output>${item.quantity}</output>
                        <button type="button" data-quantity-change="1" aria-label="Add one ${escapeHTML(item.name)}">+</button>
                    </div>
                    <button class="enquiry-remove-item" type="button" data-remove-item aria-label="Remove ${escapeHTML(item.name)}">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>`).join('') : '<div class="enquiry-selected-empty">Choose the items you are moving to see them here.</div>'}
            </div>
            <div class="enquiry-estimate"><span>Estimated item cost</span><strong>${currency(getTotal())}</strong></div>
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
        if (itemCatalogState !== 'ready') {
            const message = itemCatalogState === 'loading'
                ? 'Loading the current moving-item catalog...'
                : `Could not load the moving-item catalog: ${escapeHTML(itemCatalogError)}`;
            panel.innerHTML = `<div class="enquiry-empty-state">${message}</div>
                ${itemCatalogState === 'error' ? '<div class="enquiry-step-actions"><button class="enquiry-button" type="button" data-action="retry-catalogs">Try again</button></div>' : ''}`;
            return;
        }

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
        if (vehicleCatalogState !== 'ready') {
            const message = vehicleCatalogState === 'loading'
                ? 'Loading the current vehicle catalog...'
                : `Could not load the vehicle catalog: ${escapeHTML(vehicleCatalogError)}`;
            panel.innerHTML = `<div class="enquiry-empty-state">${message}</div>
                ${vehicleCatalogState === 'error' ? '<div class="enquiry-step-actions"><button class="enquiry-button" type="button" data-action="retry-catalogs">Try again</button></div>' : ''}`;
            return;
        }

        panel.innerHTML = `<div class="enquiry-vehicle-grid">
            ${vehicles.length ? vehicles.map(vehicle => {
                const details = [
                    vehicle.type,
                    vehicle.payloadKg !== null ? `Up to ${vehicle.payloadKg.toLocaleString('en-IN')} kg` : '',
                    vehicle.dimensions
                        ? `${vehicle.dimensions.length ?? '?'} × ${vehicle.dimensions.width ?? '?'} × ${vehicle.dimensions.height ?? '?'} cm`
                        : ''
                ].filter(Boolean).map(escapeHTML).join(' · ');
                const pricing = [
                    vehicle.basePricePaise !== null ? `Base ${currency(vehicle.basePricePaise)}` : '',
                    vehicle.pricePerKmPaise !== null ? `${currency(vehicle.pricePerKmPaise)} / km` : ''
                ].filter(Boolean).map(escapeHTML).join(' · ');
                return `<button class="enquiry-vehicle-card${selectedVehicle === vehicle.id ? ' is-selected' : ''}"
                type="button" data-vehicle="${escapeHTML(vehicle.id)}" aria-pressed="${selectedVehicle === vehicle.id}">
                <span class="enquiry-vehicle-visual"><i class="fa-solid fa-truck" aria-hidden="true"></i></span>
                <span class="enquiry-vehicle-info"><strong>${escapeHTML(vehicle.name)}</strong>
                    <span>${details || 'Vehicle details not provided'}</span>
                    ${pricing ? `<span>${pricing}</span>` : ''}</span>
            </button>`;
            }).join('') : '<p class="enquiry-empty-state">No active vehicles are listed in the catalog right now. Skip this step and our team will recommend a suitable vehicle.</p>'}
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
                            <input name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="(?=.*\\d)[\\d\\s\\+\\(\\)\\-]{6,20}" placeholder="+91 98765 43210" required>
                        </label>
                    </div>
                </section>
                <section class="enquiry-form-section">
                    <h3><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Pickup location</h3>
                    <div class="enquiry-form-grid">
                        <label class="enquiry-field"><span class="enquiry-field-label">City <span>*</span></span>
                            <input name="pickupCity" list="move-pickup-locations" data-location-search autocomplete="address-level2" placeholder="Pickup city" required>
                            <datalist id="move-pickup-locations"></datalist>
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
                            <input name="dropCity" list="move-drop-locations" data-location-search autocomplete="address-level2" placeholder="Drop city" required>
                            <datalist id="move-drop-locations"></datalist>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Google Maps link</span>
                            <input name="dropMap" type="url" placeholder="https://maps.google.com/...">
                        </label>
                        <label class="enquiry-field enquiry-field--full"><span class="enquiry-field-label">Drop address <span>*</span></span>
                            <textarea name="dropAddress" placeholder="House, street, area" required></textarea>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Drop date <span>*</span></span>
                            <input name="dropDate" type="date" min="${minDate}" required>
                        </label>
                        <label class="enquiry-field"><span class="enquiry-field-label">Drop time</span>
                            <input name="dropTime" type="time">
                        </label>
                    </div>
                </section>
                <p class="enquiry-submit-note">Review your estimate before sending your booking request to our team.</p>
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
        Object.entries(savedMoveDetails).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (field && typeof value === 'string') field.value = value;
        });
    }

    function saveMoveDetails(form) {
        savedMoveDetails = Object.fromEntries(new FormData(form).entries());
        const savedEnquiryDraft = {
            ...(savedEnquiry || {}),
            details: savedMoveDetails
        };

        try {
            sessionStorage.setItem('sakshamMoveEnquiry', JSON.stringify(savedEnquiryDraft));
            savedEnquiry = savedEnquiryDraft;
        } catch (error) {
            console.error('Unable to save move details in this browser session:', error);
            feedback.textContent = 'Your details could not be saved for this session. Please keep this page open until you request booking.';
        }
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
            description.textContent = 'Add your contact and full pickup and drop addresses so our team can prepare an accurate estimate.';
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

    function requestBooking(details) {
        const dialog = document.querySelector('.enquiry-price-dialog');
        const requestButton = dialog?.querySelector('.enquiry-price-request');
        const requestStatus = dialog?.querySelector('.enquiry-booking-status');
        if (!dialog || !requestButton || !requestStatus) return;

        if (!route.enquiryId || !route.bookingToken) {
            requestStatus.dataset.state = 'error';
            requestStatus.textContent = 'This enquiry is missing its secure booking session. Please restart the Check Price form to request a booking.';
            requestStatus.hidden = false;
            return;
        }

        const bookingItems = [...selectedItems].map(([id, quantity]) => {
            const item = items.find(entry => entry.id === id);
            if (!item) throw new Error(`Selected item ${id} is no longer in the catalog.`);
            return {
                item_id: item.itemId,
                variation_id: item.variationId,
                quantity
            };
        });
        const payload = {
            booking_token: route.bookingToken,
            name: details.name,
            email: details.email,
            mobile: details.phone,
            pickup_city: details.pickupCity,
            pickup_address: details.pickupAddress,
            pickup_map_link: details.pickupMap || null,
            pickup_date: details.pickupDate,
            pickup_time: details.pickupTime || null,
            drop_city: details.dropCity,
            drop_address: details.dropAddress,
            drop_map_link: details.dropMap || null,
            drop_date: details.dropDate,
            drop_time: details.dropTime || null,
            vehicle_id: selectedVehicle ? Number(selectedVehicle) : null,
            items: bookingItems
        };

        requestButton.disabled = true;
        requestButton.textContent = 'Sending booking request...';
        requestStatus.hidden = true;

        fetch(`${apiBase}/enquiries/${encodeURIComponent(route.enquiryId)}/booking`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(async response => {
            let result;
            try {
                result = await response.json();
            } catch (error) {
                throw new Error(`Booking API returned an unreadable response (HTTP ${response.status}).`);
            }

            if (!response.ok) {
                const validationErrors = Object.values(result.errors || {}).flat();
                const message = response.status === 404
                    ? 'This booking session is invalid or expired. Please restart the Check Price form.'
                    : response.status === 429
                        ? 'Too many booking requests. Please wait a minute before trying again.'
                        : validationErrors.length
                            ? validationErrors.join(' ')
                            : result.message || `Unable to submit the booking (HTTP ${response.status}).`;
                throw new Error(message);
            }

            requestStatus.dataset.state = 'success';
            requestStatus.textContent = result.data?.id
                ? `Booking request received successfully. Reference: ${result.data.id}. Returning to the home page in 5 seconds.`
                : 'Booking request received successfully. Returning to the home page in 5 seconds.';
            requestButton.hidden = true;
            const homeButton = document.createElement('a');
            homeButton.className = 'enquiry-button enquiry-price-home';
            homeButton.href = '../index.html';
            homeButton.textContent = 'Home page';
            requestButton.insertAdjacentElement('afterend', homeButton);
            window.setTimeout(() => {
                window.location.assign(homeButton.href);
            }, 5000);
            try {
                sessionStorage.removeItem('sakshamMoveEnquiry');
            } catch (error) {
                console.error('Unable to clear the completed booking session:', error);
            }
        }).catch(error => {
            console.error('Unable to submit booking request:', error);
            requestStatus.dataset.state = 'error';
            requestStatus.textContent = error.message || 'Unable to submit the booking. Please try again.';
        }).finally(() => {
            requestStatus.hidden = false;
            if (!requestStatus.dataset.state || requestStatus.dataset.state !== 'success') {
                requestButton.disabled = false;
                requestButton.textContent = 'Request booking';
            }
        });
    }

    function showPriceConfirmation(details) {
        const vehicle = vehicles.find(entry => entry.id === selectedVehicle);
        const vehicleBasePrice = vehicle?.basePricePaise ?? 0;
        const estimatedTotal = getTotal() + vehicleBasePrice;
        const vehiclePriceUnknown = Boolean(vehicle && vehicle.basePricePaise === null);
        const dialog = document.createElement('dialog');
        dialog.className = 'enquiry-price-dialog';
        dialog.setAttribute('aria-labelledby', 'enquiry-price-title');

        const itemRows = [...selectedItems].map(([id, quantity]) => {
            const item = items.find(entry => entry.id === id);
            return `<li><span>${escapeHTML(item.name)} × ${quantity}</span><strong>${currency(item.pricePaise * quantity)}</strong></li>`;
        }).join('');
        const vehicleRow = vehicle
            ? `<li><span>${escapeHTML(vehicle.name)} base price</span><strong>${vehicleBasePrice ? currency(vehicleBasePrice) : 'To be confirmed'}</strong></li>`
            : '<li><span>Vehicle</span><strong>To be confirmed</strong></li>';
        const distanceNote = vehicle?.pricePerKmPaise !== null && vehicle?.pricePerKmPaise !== undefined
            ? `<p class="enquiry-price-note">The vehicle rate of ${currency(vehicle.pricePerKmPaise)} per km is not included because the route distance is not available yet.</p>`
            : '<p class="enquiry-price-note">Final charges may vary after our team confirms your move details.</p>';
        const estimateNote = vehiclePriceUnknown
            ? '<p class="enquiry-price-note">The vehicle base price is not available yet, so the estimate includes only item prices.</p>'
            : '';

        dialog.innerHTML = `<div class="enquiry-price-dialog-content">
            <button class="enquiry-price-dialog-close" type="button" aria-label="Close price estimate">&times;</button>
            <p class="enquiry-kicker">MOVE ESTIMATE</p>
            <h2 id="enquiry-price-title">Your estimated price</h2>
            <p>Review the estimate below before requesting your booking.</p>
            <ul class="enquiry-price-breakdown">
                ${itemRows || '<li><span>Moving items</span><strong>None selected</strong></li>'}
                ${vehicleRow}
            </ul>
            <div class="enquiry-price-total"><span>Estimated total${vehiclePriceUnknown ? ' (known prices)' : ''}</span><strong>${currency(estimatedTotal)}</strong></div>
            ${estimateNote}
            ${distanceNote}
            <p class="enquiry-booking-status" role="status" aria-live="polite" hidden></p>
            <button class="enquiry-button enquiry-price-request" type="button">Request booking</button>
        </div>`;

        dialog.querySelector('.enquiry-price-dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('.enquiry-price-request').addEventListener('click', () => {
            try {
                requestBooking(details);
            } catch (error) {
                console.error('Unable to prepare booking request:', error);
                const status = dialog.querySelector('.enquiry-booking-status');
                status.dataset.state = 'error';
                status.textContent = error.message || 'Unable to prepare booking request.';
                status.hidden = false;
            }
        });
        dialog.addEventListener('click', event => {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.appendChild(dialog);
        dialog.showModal();
    }

    function submitRequest(form) {
        const formData = new FormData(form);
        const details = Object.fromEntries(formData.entries());
        showPriceConfirmation(details);
    }

    async function updateLocationSuggestions(input, query, controller) {
        try {
            const response = await fetch(
                `${apiBase}/service-locations/suggestions?q=${encodeURIComponent(query)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal
                }
            );
            if (!response.ok) {
                throw new Error(`Location suggestions returned HTTP ${response.status}.`);
            }

            const suggestions = await response.json();
            if (!Array.isArray(suggestions)) {
                throw new Error('Location suggestions response was not a list.');
            }
            if (input.value.trim() !== query) return;

            const list = document.getElementById(input.getAttribute('list'));
            if (!list) return;
            list.replaceChildren();
            suggestions.forEach(suggestion => {
                if (typeof suggestion.value !== 'string' || typeof suggestion.label !== 'string') return;
                const option = document.createElement('option');
                option.value = suggestion.value;
                option.label = suggestion.label;
                list.appendChild(option);
            });
            feedback.textContent = '';
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Unable to load service-location suggestions:', error);
            feedback.textContent = 'Location suggestions are unavailable right now. You can enter the location manually.';
        }
    }

    wizard.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target || !wizard.contains(target)) return;

        if (target.matches('[data-action="retry-catalogs"]')) {
            loadCatalogs();
            return;
        }

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
        if (event.target.closest('[data-enquiry-form]')) {
            saveMoveDetails(event.target.closest('[data-enquiry-form]'));
            if (!event.target.matches('[data-location-search]')) return;
        }

        if (event.target.matches('[data-location-search]')) {
            const input = event.target;
            const priorTimer = suggestionTimers.get(input);
            if (priorTimer) clearTimeout(priorTimer);
            suggestionControllers.get(input)?.abort();

            const query = input.value.trim();
            const list = document.getElementById(input.getAttribute('list'));
            if (list) list.replaceChildren();
            if (query.length < 2) return;

            const timer = window.setTimeout(() => {
                const controller = new AbortController();
                suggestionControllers.set(input, controller);
                updateLocationSuggestions(input, query, controller);
            }, 250);
            suggestionTimers.set(input, timer);
            return;
        }

        if (event.target.matches('[data-item-search]')) {
            const cursorPosition = event.target.selectionStart;
            searchTerm = event.target.value.trim().toLowerCase();
            renderItemsStep();
            const searchInput = panel.querySelector('[data-item-search]');
            searchInput.focus();
            searchInput.setSelectionRange(cursorPosition, cursorPosition);
        }
    });

    wizard.addEventListener('change', event => {
        const form = event.target.closest('[data-enquiry-form]');
        if (form) saveMoveDetails(form);
    });

    wizard.addEventListener('submit', event => {
        if (!event.target.matches('[data-enquiry-form]')) return;
        event.preventDefault();
        if (!event.target.reportValidity()) return;
        saveMoveDetails(event.target);
        submitRequest(event.target);
    });

    showAddressSummary();
    renderStep();
    loadCatalogs();
})();
