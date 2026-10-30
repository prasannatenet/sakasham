
(() => {
    const script = document.currentScript;
    const siteRoot = new URL("../../", script.src);

    async function insertComponent(file, selector) {
        const slot = document.querySelector(selector);

        if (!slot) return;

        try {
            const response = await fetch(
                new URL(file, siteRoot)
            );

            if (!response.ok) {
                throw new Error(`Failed to load ${file}`);
            }

            slot.innerHTML = await response.text();

            // Resolve links and images from the website root
            slot.querySelectorAll("[href], [src]").forEach((element) => {
                ["href", "src"].forEach((attribute) => {
                    const value = element.getAttribute(attribute);

                    if (
                        !value ||
                        value.startsWith("#") ||
                        /^[a-z][a-z\d+.-]*:/i.test(value) ||
                        value.startsWith("//")
                    ) {
                        return;
                    }

                    element.setAttribute(
                        attribute,
                        new URL(value, siteRoot).href
                    );
                });
            });

            return true;

        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async function loadSharedLayout() {
        // Load header and footer
        await Promise.all([
            insertComponent("header.html", "[data-site-header]"),
            insertComponent("footer.html", "[data-site-footer]")
        ]);

        // Notify custom.js that shared components are inserted
        document.dispatchEvent(
            new Event("shared-layout:loaded")
        );
    }

    loadSharedLayout();
})();
