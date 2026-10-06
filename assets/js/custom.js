
//Mobile menu toggle

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const menuIcon = menuToggle?.querySelector('.material-symbols-outlined');

menuToggle?.addEventListener('click', () => {
    mainNav.classList.toggle('show');

    if (mainNav.classList.contains('show')) {
        menuIcon.textContent = 'close';
        menuToggle.classList.add('active');
    } else {
        menuIcon.textContent = 'menu';
        menuToggle.classList.remove('active');
    }

});

//Mobile Dropdown Menu
const dropdownToggles = document.querySelectorAll('.nav-dropdown-toggle');
dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function (e) {
        if (window.innerWidth > 991) return;
        e.preventDefault();
        e.stopPropagation();
        const dropdown = this.closest('.nav-dropdown');
        // Close other dropdowns
        document.querySelectorAll('.nav-dropdown.open').forEach(item => {
            if (item !== dropdown) {
                item.classList.remove('open');
            }
        });
        // Toggle current dropdown
        dropdown.classList.toggle('open');
    });
});


//HERO BANNER SWIPER-----------------------------------------------------------------
const heroSwiper = new Swiper('.hero-swiper', {
    loop: true,
    speed: 1400,
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },

    effect: 'creative',
    creativeEffect: {
        prev: {
            translate: ['-8%', 0, -1],
            scale: 1.08,
            opacity: 0,
        },

        next: {
            translate: ['8%', 0, -1],
            scale: 1.12,
            opacity: 0,
        },
    },
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    on: {
        init: function () {
            updateHeroTab(this.realIndex);
        },
        slideChange: function () {
            updateHeroTab(this.realIndex);
        }
    }
});


function updateHeroTab(index) {
    document.querySelectorAll('.hero-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
}


document.querySelectorAll('.hero-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        const index = this.dataset.slide;
        heroSwiper.slideToLoop(index);
    });
});



// SOP --------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".sop-scroll");
    const sticky = document.querySelector(".sop-sticky");
    const track = document.querySelector("#sopTrack");
    const progress = document.querySelector("#sopProgress");

    if (!section || !sticky || !track) return;

    let ticking = false;

    function updateSop() {
        /*
        ========================================
        SECTION POSITION
        ========================================
        */
        const sectionTop =
            section.getBoundingClientRect().top;
        /*
        ========================================
        ACTUAL STICKY HEIGHT
        ========================================
        */
        const stickyHeight =
            sticky.getBoundingClientRect().height;
        /*
        ========================================
        ACTUAL SCROLL DISTANCE
        ========================================
        */
        const scrollDistance =
            section.offsetHeight - stickyHeight;
        if (scrollDistance <= 0) return;
        /*
        ========================================
        CURRENT SCROLL PROGRESS
        ========================================
        */
        let progressValue =
            -sectionTop / scrollDistance;
        progressValue =
            Math.max(
                0,
                Math.min(1, progressValue)
            );

        /*
        ========================================
        HORIZONTAL DISTANCE
        ========================================
        */
        const containerWidth =
            sticky.clientWidth;
        const totalWidth =
            track.scrollWidth;
        const maxMove =
            Math.max(
                0,
                totalWidth - containerWidth
            );
        /*
        ========================================
        MOVE HORIZONTALLY
        ========================================
        */
        const move = maxMove * progressValue;
        const yPosition = window.innerWidth <= 767 ? 45 : 60;
        track.style.transform =
            `translate3d(${-move}px, ${yPosition}%, 0)`;
        /*
        ========================================
        PROGRESS BAR
        ========================================
        */
        if (progress) {
            progress.style.display = "block";
            progress.style.width =
                `${progressValue * 100}%`;
        }

        /*
        ========================================
        ACTIVE CARD
        ========================================
        */
        const cards = track.querySelectorAll(".sop-card");

        if (cards.length) {
            const viewportCenter = sticky.clientWidth / 2;
            let closestCard = null;
            let closestDistance = Infinity;
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const distance = Math.abs(viewportCenter - cardCenter);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCard = card;
                }
            });
            cards.forEach(card => {
                card.classList.toggle("in-view", card === closestCard);
            });
        }

        ticking = false;
    }
    /*
    ========================================
    REQUEST ANIMATION FRAME
    ========================================
    */
    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(updateSop);
    }
    /*
    ========================================
    SCROLL
    ========================================
    */
    window.addEventListener(
        "scroll",
        requestUpdate,
        {
            passive: true
        }
    );
    /*
    ========================================
    RESIZE
    ========================================
    */
    window.addEventListener(
        "resize",
        requestUpdate
    );

    /*
    ========================================
    INITIAL
    ========================================
    */
    requestUpdate();
});

// Red strip------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const statsSection = document.querySelector(".company-stats");
    if (!statsSection) return;
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                statsSection.classList.add("show");
                observer.unobserve(statsSection);
            }
        });
    }, {
        threshold: 0.25
    });
    observer.observe(statsSection);

});

// Location-----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
const section = document.querySelector(".coverage-section");
const svgElement = document.querySelector("#indiaMap");
if (!section || !svgElement) return;
const svg = d3.select(svgElement);
const width = 600;
const height = 700;


/*
========================================
PROJECTION
========================================
*/

const projection = d3.geoMercator();
const path = d3.geoPath()
.projection(projection);

/*
========================================
LOAD GEOJSON
========================================
*/

fetch("assets/maps/india.geojson")
.then(response => {
    if (!response.ok) {
        throw new Error(
            "india.geojson file could not be loaded."
        );
    }
    return response.json();
})

.then(data => {
    /*
    ========================================
    FIT INDIA MAP INSIDE SVG
    ========================================
    */
    projection.fitSize(
        [width, height],
        {
            type: "FeatureCollection",
            features: data.features
        }
    );

    /*
    ========================================
    DRAW DISTRICTS
    ========================================
    */
    svg.selectAll(".india-district")
        .data(data.features)
        .enter()
        .append("path")
        .attr(
            "class",
            "india-district"
        )
        .attr(
            "d",
            path
        )
        .attr(
            "data-state",
            d => d.properties.st_nm
        )
        /*
        ========================================
        CLICKABLE STATES
        ========================================
        */
        .style("cursor", d => {
            const stateName =
                d.properties.st_nm;
            if (
                stateName === "Rajasthan" ||
                stateName === "Maharashtra" ||
                stateName === "Delhi"
            ) {
                return "pointer";
            }
            return "default";
        })
        .on(
            "click",
            function (event, d) {
                const stateName =
                    d.properties.st_nm;
                /*
                ========================================
                RAJASTHAN
                ========================================
                */
                if (
                    stateName === "Rajasthan"
                ) {
                    window.location.href =
                        "packers-and-movers-in-rajasthan.html";
                }

                /*
                ========================================
                MAHARASHTRA
                ========================================
                */
                if (
                    stateName === "Maharashtra"
                ) {
                    window.location.href =
                        "packers-and-movers-in-maharashtra.html";
                }
                /*
                ========================================
                DELHI NCR
                ========================================
                */
                if (
                    stateName === "Delhi"
                ) {
                    window.location.href =
                        "packers-and-movers-in-gurugram.html";
                }
            }
        );
    /*
    ========================================
    LOCATION LAYER
    ========================================
    */

    const locationLayer = svg
        .append("g")
        .attr(
            "class",
            "location-layer"
        );


    /*
    ========================================
    CREATE LOCATIONS
    ========================================
    */

    createLocation(
        "Rajasthan",
        ".location-rajasthan",
        {
            x: 75,
            y: -20
        }
    );


    createLocation(
        "Maharashtra",
        ".location-maharashtra",
        {
            x: -15,
            y: 70
        }
    );


    createLocation(
        "Delhi",
        ".location-delhi",
        {
            x: 70,
            y: -35
        }
    );


    /*
    ========================================
    LOCATION CREATOR
    ========================================
    */

    function createLocation(
        stateName,
        className,
        offset
    ) {


        /*
        Find state features
        */

        const stateFeatures =
            data.features.filter(
                d =>
                    d.properties.st_nm ===
                    stateName
            );


        if (!stateFeatures.length) {

            console.warn(
                `${stateName} not found in GeoJSON`
            );

            return;

        }


        /*
        ========================================
        GET ACTUAL STATE CENTER
        ========================================
        */

        const featureCollection = {

            type: "FeatureCollection",

            features: stateFeatures

        };


        const center =
            path.centroid(
                featureCollection
            );


        const x = center[0];
        const y = center[1];


        /*
        ========================================
        LABEL POSITION
        ========================================
        */

        const labelX =
            x + offset.x;

        const labelY =
            y + offset.y;


        /*
        ========================================
        LOCATION GROUP
        ========================================
        */

        const group =
            locationLayer
                .append("g")
                .attr(
                    "class",
                    `map-location ${className.replace(".", "")}`
                );


        /*
        ========================================
        CONNECTOR LINE
        ========================================
        */

        group
            .append("line")
            .attr(
                "class",
                "location-line"
            )
            .attr(
                "x1",
                x
            )
            .attr(
                "y1",
                y
            )
            .attr(
                "x2",
                labelX
            )
            .attr(
                "y2",
                labelY
            );


        /*
        ========================================
        PULSE
        ========================================
        */

        group
            .append("circle")
            .attr(
                "class",
                "location-pulse"
            )
            .attr(
                "cx",
                x
            )
            .attr(
                "cy",
                y
            )
            .attr(
                "r",
                16
            );


        /*
        ========================================
        MAIN DOT
        ========================================
        */

        group
            .append("circle")
            .attr(
                "class",
                "location-dot"
            )
            .attr(
                "cx",
                x
            )
            .attr(
                "cy",
                y
            )
            .attr(
                "r",
                6
            );


        /*
        ========================================
        LABEL BACKGROUND
        ========================================
        */

        group
            .append("rect")
            .attr(
                "class",
                "location-label location-label-bg"
            )
            .attr(
                "x",
                labelX - 5
            )
            .attr(
                "y",
                labelY - 15
            )
            .attr(
                "width",
                stateName === "Delhi"
                    ? 90
                    : stateName === "Maharashtra"
                        ? 105
                        : 85
            )
            .attr(
                "height",
                30
            );

        /*
        ========================================
        LABEL TEXT
        ========================================
        */
        group
            .append("text")
            .attr(
                "class",
                "location-label location-label-text"
            )
            .attr(
                "x",
                labelX + 5
            )
            .attr(
                "y",
                labelY
            )
            .text(
                stateName === "Delhi"
                    ? "Delhi NCR"
                    : stateName
            );
    }


    /*
    ========================================
    SECTION ANIMATION
    ========================================
    */
    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    section.classList.add(
                        "active"
                    );
                    /*
                    ==============================
                    RAJASTHAN
                    ==============================
                    */

                    setTimeout(() => {
                        highlightState(
                            "Rajasthan"
                        );
                        showLocation(
                            ".location-rajasthan"
                        );
                    }, 800);

                    /*
                    ==============================
                    MAHARASHTRA
                    ==============================
                    */
                    setTimeout(() => {
                        highlightState(
                            "Maharashtra"
                        );

                        showLocation(
                            ".location-maharashtra"
                        );
                    }, 1800);

                    /*
                    ==============================
                    DELHI NCR
                    ==============================
                    */
                    setTimeout(() => {
                        highlightState(
                            "Delhi"
                        );

                        showLocation(
                            ".location-delhi"
                        );

                    }, 2800);
                    observer.unobserve(
                        section
                    );
                });
            },
            {
                threshold: 0.25
            }
        );
    observer.observe(section);
    /*
    ========================================
    HIGHLIGHT STATE
    ========================================
    */
    function highlightState(stateName) {
        svg
            .selectAll(
                ".india-district"
            )
            .filter(
                d =>
                    d.properties.st_nm ===
                    stateName
            )
            .classed(
                "active-state",
                true
            );
    }
    /*
    ========================================
    SHOW LOCATION
    ========================================
    */
    function showLocation(selector) {
        const element =
            svgElement.querySelector(
                selector
            );
        if (!element) return;
        element.classList.add(
            "show"
        );
    }
})

.catch(error => {
    console.error(
        "India Map Error:",
        error
    );
});
});


// HOME SERVICES SECTION
document.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".service-hero");
    if (!hero) return;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
        hero.classList.toggle("is-visible", entry.isIntersecting);
    }, {
        threshold: 0.2
    });
    visibilityObserver.observe(hero);

    const tabs =
        hero.querySelectorAll(".service-tab");
    const slide =
        hero.querySelector(".service-slide");
    const content =
        hero.querySelector(".service-content-inner");
    const contents =
        hero.querySelectorAll(".service-content-item");
    let currentIndex = 3;
    let autoTimer;
    let isAnimating = false;
    const duration = 12000;

    /*
    ========================================
    INITIAL IMAGE
    ========================================
    */

    slide.style.backgroundImage =
        `url("${tabs[currentIndex].dataset.image}")`;

    /*
    ========================================
    CHANGE SERVICE
    ========================================
    */

    function changeService(index) {
        if (
            isAnimating ||
            index === currentIndex
        ) {
            return;
        }

        isAnimating = true;
        const tab = tabs[index];


        /*
        ========================================
        ACTIVE TAB
        ========================================
        */

        tabs.forEach(item => {
            item.classList.remove("active");
        });
        tab.classList.add("active");

        /*
        ========================================
        SCROLL ACTIVE TAB
        ========================================
        */
        const tabsContainer =
            hero.querySelector(".service-tabs");
        if (tabsContainer) {
            const targetLeft =
                tab.offsetLeft -
                (tabsContainer.clientWidth -
                    tab.offsetWidth) / 2;
            tabsContainer.scrollTo({
                left: targetLeft,
                behavior: "smooth"
            });
        }


        /*
        ========================================
        CONTENT OUT
        ========================================
        */
        content.classList.remove("switch-in");
        content.classList.add("switch-out");


        /*
        ========================================
        CHANGE IMAGE + CONTENT
        ========================================
        */

        setTimeout(() => {

            /*
            IMAGE
            */

            slide.style.backgroundImage =
                `url("${tab.dataset.image}")`;
            slide.classList.remove("wipe");
            void slide.offsetWidth;
            slide.classList.add("wipe");

            /*
            CONTENT
            */

            contents.forEach(item => {
                item.classList.remove("active");
            });
            contents[index].classList.add("active");


            /*
            CONTENT IN
            */
            content.classList.remove("switch-out");
            void content.offsetWidth;
            content.classList.add("switch-in");

            /*
            CURRENT INDEX
            */
            currentIndex = index;
            setTimeout(() => {
                isAnimating = false;
            }, 650);
        }, 350);

        /*
        ========================================
        RESTART AUTOPLAY
        ========================================
        */
        startAutoPlay();
    }


    /*
    ========================================
    TAB CLICK
    ========================================
    */
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            changeService(index);
        });
    });

    /*
    ========================================
    AUTO PLAY
    ========================================
    */
    function startAutoPlay() {
        clearInterval(autoTimer);
        autoTimer = setInterval(() => {
            const nextIndex =
                (currentIndex + 1) % tabs.length;
            changeService(nextIndex);
        }, duration);
    }
    startAutoPlay();
});

//FAQ----------------------------------------------------------------------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const faqItems = document.querySelectorAll(".faq-item");
    faqItems.forEach(item => {
        const button = item.querySelector(".faq-question");
        button.addEventListener("click", () => {
            const isActive = item.classList.contains("active");
            // Close all
            faqItems.forEach(faq => {
                faq.classList.remove("active");
            });
            // Open clicked item
            if (!isActive) {
                item.classList.add("active");
            }
        });
    });
});


// Testimonial slider--------------------------------------------------------------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector(".testimonial-slider");
    if (!slider) return;
    const track = slider.querySelector(".testimonial-track");
    const cards = [...slider.querySelectorAll(".testimonial-card")];
    const prevBtn = slider.querySelector(".testimonial-prev");
    const nextBtn = slider.querySelector(".testimonial-next");
    const dotsContainer = slider.querySelector(".testimonial-dots");

    let currentIndex = 0;
    let autoPlay;


    /* =========================
       VISIBLE CARDS
    ========================= */

    function visibleCards() {
        if (window.innerWidth <= 600) {
            return 1;
        }

        if (window.innerWidth <= 900) {
            return 2;
        }
        return 3;
    }


    /* =========================
       CREATE DOTS
    ========================= */

    function createDots() {
        dotsContainer.innerHTML = "";
        const totalSlides = Math.ceil(
            cards.length / visibleCards()
        );

        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "testimonial-dot";
            dot.addEventListener("click", () => {
                goToSlide(i);
                restartAutoPlay();
            });
            dotsContainer.appendChild(dot);
        }
    }


    function goToSlide(index) {
        const visible = visibleCards();
        const maxIndex = Math.max(
            0,
            cards.length - visible
        );

        /*
         * Loop back to first slide
         */
        if (index > maxIndex) {
            currentIndex = 0;
        } else if (index < 0) {
            currentIndex = maxIndex;
        } else {
            currentIndex = index;
        }

        const target = cards[currentIndex];
        track.scrollTo({
            left: target.offsetLeft,
            behavior: "smooth"
        });
        updateDots();
    }


    /* =========================
       DOTS
    ========================= */

    function updateDots() {
        const dots = dotsContainer.querySelectorAll(
            ".testimonial-dot"
        );
        const dotIndex = Math.floor(
            currentIndex / visibleCards()
        );
        dots.forEach(dot => {
            dot.classList.remove("active");
        });
        if (dots[dotIndex]) {
            dots[dotIndex].classList.add("active");
        }
    }


    /* =========================
       NEXT
    ========================= */

    nextBtn.addEventListener("click", () => {
        goToSlide(
            currentIndex + visibleCards()
        );
        restartAutoPlay();
    });


    /* =========================
       PREVIOUS
    ========================= */

    prevBtn.addEventListener("click", () => {
        goToSlide(
            currentIndex - visibleCards()
        );
        restartAutoPlay();
    });

    function startAutoPlay() {
        clearInterval(autoPlay);
        autoPlay = setInterval(() => {
            goToSlide(
                currentIndex + visibleCards()
            );
        }, 5000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlay);
    }

    function restartAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }


    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    window.addEventListener("resize", () => {
        createDots();
        currentIndex = 0;
        goToSlide(0);
    });

    createDots();
    goToSlide(0);
    startAutoPlay();

});


// BACK TO TOP

document.addEventListener("DOMContentLoaded", () => {
    const backToTop = document.getElementById("backToTop");
    if (!backToTop) return;
    window.addEventListener("scroll", () => {
        if (window.scrollY > 500) {
            backToTop.classList.add("show");
        } else {
            backToTop.classList.remove("show");
        }
    });

    backToTop.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});


// LOCATION SEARCH-----------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("locationSearch");
    const clearButton = document.getElementById("clearLocationSearch");
    const locationCount = document.getElementById("locationCount");
    const noResult = document.getElementById("locationNoResult");

    const locationCards = document.querySelectorAll(
        ".locations-grid .location-card"
    );

    if (!searchInput || !locationCards.length) return;

    function filterLocations() {
        const searchValue = searchInput.value
            .trim()
            .toLowerCase();

        let visibleCount = 0;
        locationCards.forEach(card => {
            const locationName =
                card.querySelector("h3")?.textContent
                    .toLowerCase() || "";

            const locationType =
                card.querySelector(".location-type")?.textContent
                    .toLowerCase() || "";

            const searchableText =
                `${locationName} ${locationType}`;

            const matched =
                searchableText.includes(searchValue);

            card.style.display = matched ? "" : "none";

            if (matched) {
                visibleCount++;
            }
        });


        /* Count */

        locationCount.textContent =
            `${visibleCount} location${visibleCount !== 1 ? "s" : ""}`;

        /* No result */
        if (noResult) {
            if (visibleCount === 0) {
                noResult.classList.add("show");
            } else {
                noResult.classList.remove("show");
            }
        }


        /* Clear button */
        if (searchValue) {
            clearButton.classList.add("show");
        } else {
            clearButton.classList.remove("show");
        }
    }


    searchInput.addEventListener("input", filterLocations);
    clearButton.addEventListener("click", () => {
        searchInput.value = "";
        filterLocations();
        searchInput.focus();
    });

    /* Initial count */
    filterLocations();
});

// State slider ------------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.querySelector(".cities-slider");
    const track = document.querySelector(".cities-track");
    if (!slider || !track) return;
    const cards = [...track.querySelectorAll(".city-card")];
    const prevBtn = document.querySelector(".city-prev");
    const nextBtn = document.querySelector(".city-next");
    const currentEl = document.getElementById("cityCurrent");
    const totalEl = document.getElementById("cityTotal");
    const progress = document.querySelector(".city-progress span");
    let current = 0;
    let timer = null;
    let isPaused = false;

    function getVisibleCards() {
        if (window.innerWidth <= 700) {
            return 1;
        }
        if (window.innerWidth <= 1000) {
            return 3;
        }
        return 4;
    }


    function updateSlider() {
        const visible = getVisibleCards();
        const maxIndex = Math.max(
            0,
            cards.length - visible
        );

        if (current > maxIndex) {
            current = maxIndex;
        }

        const cardWidth = cards[0].offsetWidth;
        const gap = 20;
        track.style.transform =
            `translateX(-${current * (cardWidth + gap)}px)`;

        if (currentEl) {
            currentEl.textContent =
                String(current + 1).padStart(2, "0");
        }
        if (totalEl) {
            totalEl.textContent =
                String(maxIndex + 1).padStart(2, "0");
        }
        if (progress) {
            const percentage =
                ((current + 1) / (maxIndex + 1)) * 100;
            progress.style.width =
                `${percentage}%`;
        }
    }


    function nextSlide() {
        const visible = getVisibleCards();
        const maxIndex =
            Math.max(0, cards.length - visible);
        current++;
        if (current > maxIndex) {
            current = 0;
        }
        updateSlider();
    }

    function prevSlide() {
        const visible = getVisibleCards();
        const maxIndex =
            Math.max(0, cards.length - visible);
        current--;
        if (current < 0) {
            current = maxIndex;
        }
        updateSlider();
    }

    function startAutoPlay() {
        clearInterval(timer);
        timer = setInterval(() => {
            if (!isPaused) {
                nextSlide();
            }
        }, 4500);
    }

    nextBtn?.addEventListener("click", () => {
        nextSlide();
        startAutoPlay();
    });

    prevBtn?.addEventListener("click", () => {
        prevSlide();
        startAutoPlay();
    });

    slider.addEventListener("mouseenter", () => {
        isPaused = true;
    });

    slider.addEventListener("mouseleave", () => {
        isPaused = false;
    });

    window.addEventListener("resize", updateSlider);
    totalEl.textContent =
        String(
            Math.max(
                1,
                cards.length - getVisibleCards() + 1
            )
        ).padStart(2, "0");

    updateSlider();
    startAutoPlay();
});


// SAFTY-------------------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const safetySection =
        document.querySelector(".safety-section");
    if (!safetySection) return;

    const observer =
        new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        safetySection.classList.add(
                            "is-visible"
                        );
                        observer.unobserve(
                            safetySection
                        );
                    }
                });
            },
            {
                threshold: 0.2
            }
        );
    observer.observe(safetySection);
});





/* ==============================
   REUSABLE MODAL
================================ */

document.addEventListener('DOMContentLoaded', function () {

    /* Open Modal */
    document.querySelectorAll('[data-modal]').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const modalId = this.dataset.modal;
            const modal = document.getElementById(modalId);

            if (!modal) return;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        });
    });


    /* Close Modal */

    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', function () {
            const modal = this.closest('.site-modal');
            if (!modal) return;
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        });
    });


    /* ESC */

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const modal = document.querySelector('.site-modal.active');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    });
});