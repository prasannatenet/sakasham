// Location -----------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const section =
        document.querySelector(".rajasthan-service-map, .coverage-section");

    const svgElement =
        document.querySelector("#rajasthanMap");
    const mapLoader =
        document.querySelector("#mapLoader");

    if (!section || !svgElement) return;

    const svg =
        d3.select(svgElement);

    const width = 600;
    const height = 700;


    /*
    ========================================
    GET ACTIVE DISTRICT FROM URL
    ========================================
    */

    function getActiveDistrict() {

        const fileName =
            window.location.pathname
                .split("/")
                .pop()
                .replace(".html", "");

        /*
        Example:

        packers-and-movers-in-jaipur.html

        becomes:

        jaipur
        */

        return fileName
            .replace(
                "packers-and-movers-in-",
                ""
            )
            .toLowerCase();

    }


    const districtByCity = {
        pilani: "jhunjhunu"
    };
    const requestedLocationSlug = getActiveDistrict();
    const activeDistrictSlug =
        districtByCity[requestedLocationSlug] || requestedLocationSlug;


    /*
    ========================================
    DISTRICT CONFIG
    ========================================
    */

    const districts = {

        "ajmer": {
            name: "Ajmer",
            slug: "ajmer",
            offset: {
                x: 55,
                y: -35
            }
        },

        "alwar": {
            name: "Alwar",
            slug: "alwar",
            offset: {
                x: 55,
                y: -35
            }
        },

        "balotra": {
            name: "Balotra",
            slug: "balotra",
            offset: {
                x: 65,
                y: -25
            }
        },

        "banswara": {
            name: "Banswara",
            slug: "banswara",
            offset: {
                x: 55,
                y: 35
            }
        },

        "baran": {
            name: "Baran",
            slug: "baran",
            offset: {
                x: 55,
                y: 25
            }
        },

        "barmer": {
            name: "Barmer",
            slug: "barmer",
            offset: {
                x: 65,
                y: -30
            }
        },

        "beawar": {
            name: "Beawar",
            slug: "beawar",
            offset: {
                x: 60,
                y: -35
            }
        },

        "bharatpur": {
            name: "Bharatpur",
            slug: "bharatpur",
            offset: {
                x: 60,
                y: -35
            }
        },

        "bhilwara": {
            name: "Bhilwara",
            slug: "bhilwara",
            offset: {
                x: 60,
                y: 30
            }
        },

        "bikaner": {
            name: "Bikaner",
            slug: "bikaner",
            offset: {
                x: 60,
                y: -35
            }
        },

        "bundi": {
            name: "Bundi",
            slug: "bundi",
            offset: {
                x: 55,
                y: 30
            }
        },

        "chittorgarh": {
            name: "Chittorgarh",
            slug: "chittorgarh",
            offset: {
                x: 65,
                y: 30
            }
        },

        "churu": {
            name: "Churu",
            slug: "churu",
            offset: {
                x: 55,
                y: -35
            }
        },

        "dausa": {
            name: "Dausa",
            slug: "dausa",
            offset: {
                x: 55,
                y: 30
            }
        },

        "deeg": {
            name: "Deeg",
            slug: "deeg",
            offset: {
                x: 55,
                y: -30
            }
        },

        "dholpur": {
            name: "Dholpur",
            slug: "dholpur",
            offset: {
                x: 55,
                y: 30
            }
        },

        "didwana-kuchaman": {
            name: "Didwana-Kuchaman",
            slug: "didwana-kuchaman",
            offset: {
                x: 70,
                y: -35
            }
        },

        "dungarpur": {
            name: "Dungarpur",
            slug: "dungarpur",
            offset: {
                x: 60,
                y: 30
            }
        },

        "hanumangarh": {
            name: "Hanumangarh",
            slug: "hanumangarh",
            offset: {
                x: 65,
                y: -30
            }
        },

        "jaipur": {
            name: "Jaipur",
            slug: "jaipur",
            offset: {
                x: 65,
                y: -40
            }
        },

        "jaisalmer": {
            name: "Jaisalmer",
            slug: "jaisalmer",
            offset: {
                x: 65,
                y: -30
            }
        },

        "jalore": {
            name: "Jalore",
            slug: "jalore",
            offset: {
                x: 60,
                y: 30
            }
        },

        "jhalawar": {
            name: "Jhalawar",
            slug: "jhalawar",
            offset: {
                x: 60,
                y: 30
            }
        },

        "jhunjhunu": {
            name: "Jhunjhunu",
            slug: "jhunjhunu",
            offset: {
                x: 60,
                y: -30
            }
        },

        "jodhpur": {
            name: "Jodhpur",
            slug: "jodhpur",
            offset: {
                x: 65,
                y: -35
            }
        },

        "karauli": {
            name: "Karauli",
            slug: "karauli",
            offset: {
                x: 60,
                y: 30
            }
        },

        "khairthal-tijara": {
            name: "Khairthal-Tijara",
            slug: "khairthal-tijara",
            offset: {
                x: 70,
                y: -30
            }
        },

        "kota": {
            name: "Kota",
            slug: "kota",
            offset: {
                x: 60,
                y: 30
            }
        },

        "kotputli-behror": {
            name: "Kotputli-Behror",
            slug: "kotputli-behror",
            offset: {
                x: 70,
                y: -35
            }
        },

        "nagaur": {
            name: "Nagaur",
            slug: "nagaur",
            offset: {
                x: 60,
                y: -35
            }
        },

        "pali": {
            name: "Pali",
            slug: "pali",
            offset: {
                x: 60,
                y: 30
            }
        },

        "phalodi": {
            name: "Phalodi",
            slug: "phalodi",
            offset: {
                x: 65,
                y: -30
            }
        },

        "pratapgarh": {
            name: "Pratapgarh",
            slug: "pratapgarh",
            offset: {
                x: 65,
                y: 30
            }
        },

        "rajsamand": {
            name: "Rajsamand",
            slug: "rajsamand",
            offset: {
                x: 65,
                y: 30
            }
        },

        "salumbar": {
            name: "Salumbar",
            slug: "salumbar",
            offset: {
                x: 65,
                y: 30
            }
        },

        "sawai-madhopur": {
            name: "Sawai Madhopur",
            slug: "sawai-madhopur",
            offset: {
                x: 70,
                y: 30
            }
        },

        "sikar": {
            name: "Sikar",
            slug: "sikar",
            offset: {
                x: 60,
                y: -35
            }
        },

        "sirohi": {
            name: "Sirohi",
            slug: "sirohi",
            offset: {
                x: 60,
                y: 30
            }
        },

        "sri-ganganagar": {
            name: "Sri Ganganagar",
            slug: "sri-ganganagar",
            offset: {
                x: 70,
                y: -30
            }
        },

        "tonk": {
            name: "Tonk",
            slug: "tonk",
            offset: {
                x: 55,
                y: 30
            }
        },

        "udaipur": {
            name: "Udaipur",
            slug: "udaipur",
            offset: {
                x: 60,
                y: 30
            }
        }

    };


    /*
    ========================================
    ACTIVE DISTRICT
    ========================================
    */

    const activeLocation =
        districts[activeDistrictSlug];
    const activeDistrictName =
        document.querySelector("#activeDistrictName");

    if (activeLocation && activeDistrictName) {
        activeDistrictName.textContent = activeLocation.name;
    }


    /*
    ========================================
    PROJECTION
    ========================================
    */

    const projection =
        d3.geoMercator();

    const path =
        d3.geoPath()
            .projection(projection);


    /*
    ========================================
    LOAD GEOJSON
    ========================================
    */

    fetch("assets/maps/rajasthan.geojson")

        .then(response => {

            if (!response.ok) {

                throw new Error(
                    "rajasthan.geojson file could not be loaded."
                );

            }

            return response.json();

        })

        .then(data => {


            /*
            ========================================
            FIT RAJASTHAN MAP
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

            svg
                .selectAll(".rajasthan-district")
                .data(data.features)
                .enter()
                .append("path")
                .attr(
                    "class",
                    "rajasthan-district"
                )
                .attr(
                    "d",
                    path
                )
                .attr(
                    "data-district",
                    d => getDistrictName(d)
                )
                .append("title")
                .text(
                    d => getDistrictName(d)
                );

            svg
                .selectAll(".rajasthan-district")
                .style(
                    "transition-delay",
                    (_, index) => `${Math.min(index * 8, 260)}ms`
                )
                .style(
                    "cursor",
                    "pointer"
                )
                .on(
                    "click",
                    function (event, d) {

                        const slug =
                            normalize(
                                getDistrictName(d)
                            );

                        const page =
                            `packers-and-movers-in-${slug}.html`;

                        window.location.href =
                            page;

                    }
                );


            /*
            ========================================
            LOCATION LAYER
            ========================================
            */

            const locationLayer =
                svg
                    .append("g")
                    .attr(
                        "class",
                        "location-layer"
                    );


            /*
            ========================================
            CREATE ACTIVE LOCATION
            ========================================
            */

            if (activeLocation) {

                createLocation(
                    activeLocation.name,
                    activeLocation.slug,
                    activeLocation.offset,
                    data
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

                        entries.forEach(
                            entry => {

                                if (
                                    !entry.isIntersecting
                                ) {
                                    return;
                                }


                                section.classList.add(
                                    "active"
                                );


                                if (
                                    activeLocation
                                ) {

                                    setTimeout(
                                        () => {

                                            svg
                                                .selectAll(".rajasthan-district")
                                                .filter(
                                                    d => normalize(getDistrictName(d)) === activeDistrictSlug
                                                )
                                                .classed("active-state", true);

                                            showLocation(
                                                `.location-${activeLocation.slug}`
                                            );

                                        },
                                        700
                                    );

                                }


                                observer.unobserve(
                                    section
                                );

                            }
                        );

                    },
                    {
                        threshold: 0.25
                    }
                );


            observer.observe(section);
            mapLoader?.classList.add("hide");


            /*
            ========================================
            LOCATION CREATOR
            ========================================
            */

            function createLocation(
                districtName,
                districtSlug,
                offset,
                geoData
            ) {


                /*
                ========================================
                FIND DISTRICT
                ========================================
                */

                const districtFeatures =
                    geoData.features.filter(
                        d =>
                            normalize(
                                getDistrictName(d)
                            ) ===
                            districtSlug
                    );


                if (
                    !districtFeatures.length
                ) {

                    console.warn(
                        `${districtName} not found in GeoJSON`
                    );

                    return;

                }


                /*
                ========================================
                FEATURE COLLECTION
                ========================================
                */

                const featureCollection = {

                    type: "FeatureCollection",

                    features: districtFeatures

                };


                /*
                ========================================
                GET CENTER
                ========================================
                */

                const center =
                    path.centroid(
                        featureCollection
                    );


                const x =
                    center[0];

                const y =
                    center[1];


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
                            `map-location location-${districtSlug}`
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
                LABEL WIDTH
                ========================================
                */

                const labelWidth =
                    Math.max(
                        85,
                        districtName.length * 7 + 25
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
                        labelWidth
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
                        districtName
                    );

            }


            /*
            ========================================
            GET DISTRICT NAME
            ========================================
            */

            function getDistrictName(d) {
                return d.properties?.Dist_Name || "";
            }


            /*
            ========================================
            NORMALIZE DISTRICT
            ========================================
            */

            function normalize(name) {

                const slug = String(name)
                    .toLowerCase()
                    .trim()
                    .replace(
                        /district/g,
                        ""
                    )
                    .replace(
                        /[^a-z0-9]+/g,
                        "-"
                    )
                    .replace(
                        /^-|-$/g,
                        ""
                    );

                return slug === "jhunjhunun" ? "jhunjhunu" : slug;

            }


            /*
            ========================================
            SHOW LOCATION
            ========================================
            */

            function showLocation(
                selector
            ) {

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
                "Rajasthan Map Error:",
                error
            );
            if (mapLoader) {
                mapLoader.textContent = "Map could not be loaded. Please try again later.";
            }

        });

});