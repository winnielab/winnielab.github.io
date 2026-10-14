(function () {
    "use strict";

    const root = document.documentElement;
    const themeToggle = document.querySelector(".theme-toggle");
    const themeIcon = document.querySelector(".theme-icon");
    const storedTheme = localStorage.getItem("young-blog-theme");

    if (storedTheme === "light" || storedTheme === "dark") {
        root.dataset.theme = storedTheme;
    }

    function effectiveTheme() {
        if (root.dataset.theme !== "auto") return root.dataset.theme;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function updateThemeButton() {
        const isDark = effectiveTheme() === "dark";
        themeIcon.textContent = isDark ? "☀" : "◐";
        themeToggle.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
        themeToggle.title = isDark ? "切换浅色模式" : "切换深色模式";
    }

    themeToggle.addEventListener("click", function () {
        const next = effectiveTheme() === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        localStorage.setItem("young-blog-theme", next);
        updateThemeButton();
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeButton);
    updateThemeButton();

    const escapeHtml = (value) => value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const keywords = new Set([
        "abstract", "assert", "break", "case", "catch", "class", "const", "continue",
        "default", "do", "else", "enum", "extends", "final", "finally", "for", "goto",
        "if", "implements", "import", "instanceof", "interface", "native", "new", "package",
        "private", "protected", "public", "return", "static", "strictfp", "super", "switch",
        "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while"
    ]);
    const literals = new Set(["true", "false", "null"]);
    const primitiveTypes = new Set(["boolean", "byte", "char", "double", "float", "int", "long", "short", "var"]);

    function span(className, value) {
        return '<span class="' + className + '">' + escapeHtml(value) + "</span>";
    }

    function highlightJava(source) {
        let output = "";
        let index = 0;

        while (index < source.length) {
            const rest = source.slice(index);

            if (rest.startsWith("//")) {
                const end = source.indexOf("\n", index);
                const stop = end === -1 ? source.length : end;
                output += span("tok-comment", source.slice(index, stop));
                index = stop;
                continue;
            }

            if (rest.startsWith("/*")) {
                const end = source.indexOf("*/", index + 2);
                const stop = end === -1 ? source.length : end + 2;
                output += span("tok-comment", source.slice(index, stop));
                index = stop;
                continue;
            }

            const current = source[index];
            if (current === '"' || current === "'") {
                const quote = current;
                let stop = index + 1;
                while (stop < source.length) {
                    if (source[stop] === "\\") {
                        stop += 2;
                        continue;
                    }
                    if (source[stop] === quote) {
                        stop += 1;
                        break;
                    }
                    stop += 1;
                }
                output += span("tok-string", source.slice(index, stop));
                index = stop;
                continue;
            }

            const annotation = rest.match(/^@[A-Za-z_$][\w$]*/);
            if (annotation) {
                output += span("tok-annotation", annotation[0]);
                index += annotation[0].length;
                continue;
            }

            const number = rest.match(/^(?:0[xX][\dA-Fa-f_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?[fFdDlL]?)/);
            if (number) {
                output += span("tok-number", number[0]);
                index += number[0].length;
                continue;
            }

            const identifier = rest.match(/^[A-Za-z_$][\w$]*/);
            if (identifier) {
                const word = identifier[0];
                const after = source.slice(index + word.length);
                if (keywords.has(word)) {
                    output += span("tok-keyword", word);
                } else if (literals.has(word)) {
                    output += span("tok-literal", word);
                } else if (primitiveTypes.has(word) || /^[A-Z]/.test(word)) {
                    output += span("tok-type", word);
                } else if (/^\s*\(/.test(after)) {
                    output += span("tok-method", word);
                } else {
                    output += escapeHtml(word);
                }
                index += word.length;
                continue;
            }

            output += escapeHtml(current);
            index += 1;
        }
        return output;
    }

    document.querySelectorAll('.code-block[data-language="java"]').forEach(function (block) {
        const code = block.querySelector("code");
        const rawCode = code.textContent.replace(/^\n|\n$/g, "");
        code.innerHTML = highlightJava(rawCode);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-button";
        button.textContent = "复制代码";
        button.setAttribute("aria-label", "复制 Java 代码");
        button.addEventListener("click", async function () {
            try {
                await navigator.clipboard.writeText(rawCode);
                button.textContent = "已复制";
                button.classList.add("is-copied");
                window.setTimeout(function () {
                    button.textContent = "复制代码";
                    button.classList.remove("is-copied");
                }, 1600);
            } catch (error) {
                button.textContent = "复制失败";
            }
        });
        block.appendChild(button);
    });

    const toc = document.querySelector("#toc");
    const headings = Array.from(document.querySelectorAll("article section > h2, article section > h3"));
    const observedTargets = [];
    const linksById = new Map();

    headings.forEach(function (heading) {
        const isSectionHeading = heading.tagName === "H2";
        const target = isSectionHeading ? heading.closest("section") : heading;
        if (!target.id) return;

        const link = document.createElement("a");
        link.href = "#" + target.id;
        link.dataset.level = isSectionHeading ? "2" : "3";
        link.textContent = heading.textContent.replace(/^\d+\.\s*/, "");
        toc.appendChild(link);
        observedTargets.push(target);
        linksById.set(target.id, link);
    });

    const activateToc = function (id) {
        linksById.forEach(function (link, key) {
            link.classList.toggle("is-active", key === id);
            if (key === id && window.innerWidth <= 820) {
                const targetLeft = link.offsetLeft - (toc.clientWidth - link.clientWidth) / 2;
                toc.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
            }
        });
    };

    const visibleTargets = new Map();
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                visibleTargets.set(entry.target.id, entry.boundingClientRect.top);
            } else {
                visibleTargets.delete(entry.target.id);
            }
        });

        if (visibleTargets.size > 0) {
            const nearest = Array.from(visibleTargets.entries()).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
            activateToc(nearest[0]);
        }
    }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] });

    observedTargets.forEach(function (target) { observer.observe(target); });
    if (observedTargets[0]) activateToc(observedTargets[0].id);

    const progress = document.querySelector(".reading-progress span");
    const backToTop = document.querySelector(".back-to-top");

    function updateReadingState() {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        progress.style.width = (ratio * 100).toFixed(2) + "%";
        backToTop.classList.toggle("is-visible", window.scrollY > 700);
    }

    window.addEventListener("scroll", updateReadingState, { passive: true });
    window.addEventListener("resize", updateReadingState);
    backToTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
    updateReadingState();
}());
