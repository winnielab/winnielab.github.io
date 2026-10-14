(function () {
    "use strict";

    const root = document.documentElement;
    const toggle = document.querySelector(".theme-toggle");
    const icon = document.querySelector(".theme-icon");
    const storedTheme = localStorage.getItem("young-blog-theme");

    if (storedTheme === "light" || storedTheme === "dark") {
        root.dataset.theme = storedTheme;
    }

    function effectiveTheme() {
        if (root.dataset.theme !== "auto") return root.dataset.theme;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function updateToggle() {
        const isDark = effectiveTheme() === "dark";
        icon.textContent = isDark ? "☀" : "◐";
        toggle.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
        toggle.title = isDark ? "切换浅色模式" : "切换深色模式";
    }

    toggle.addEventListener("click", function () {
        const next = effectiveTheme() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        localStorage.setItem("young-blog-theme", next);
        updateToggle();
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateToggle);
    updateToggle();
}());
