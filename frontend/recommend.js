// recommend.js - connects the "Recommend for me" button to POST /api/recommend with modern cyberpunk 3D aesthetics
(function () {
    const HOSTS = ["http://127.0.0.1:8000", "http://localhost:8000"];

    function esc(t) {
        return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    async function callApi(payload) {
        let lastErr;
        for (const host of HOSTS) {
            try {
                const res = await fetch(host + "/api/recommend", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Server replied " + res.status);
                return await res.json();
            } catch (err) {
                lastErr = err;
            }
        }
        throw lastErr;
    }

    function findValue(obj, words, type) {
        for (const key of Object.keys(obj)) {
            const k = key.toLowerCase();
            if (words.some(function (w) { return k.includes(w); }) && typeof obj[key] === type) {
                return obj[key];
            }
        }
        return null;
    }

    function cardHtml(r) {
        let match = findValue(r, ["match", "percent"], "number");
        if (match === null) match = findValue(r, ["score"], "number");
        const reason = findValue(r, ["reason", "why", "explain"], "string");
        const level = esc(r.level || "Beginner");
        const levelClass = "level-" + (r.level || "Beginner").toLowerCase();
        const category = esc(r.category || "Workshop");
        const topics = Array.isArray(r.topics) ? r.topics : [];
        const matchingTopics = Array.isArray(r.matching_topics) ? r.matching_topics : [];

        const topicsBadges = topics.map(function (t) {
            const isMatch = matchingTopics.some(function (m) { return m.toLowerCase() === t.toLowerCase(); });
            const badgeStyle = isMatch
                ? 'style="color:var(--neon-green,#10b981);border-color:rgba(16,185,129,0.5);background:rgba(16,185,129,0.15);font-weight:700;"'
                : '';
            return '<span class="rec-topic-tag" ' + badgeStyle + '>' + (isMatch ? '✓ ' : '') + esc(t) + '</span>';
        }).join("");

        return (
            '<article class="recommended-card">' +
                '<div class="rec-card-header">' +
                    '<div class="rec-card-meta">' +
                        '<span class="rec-badge-category">' + category + '</span>' +
                        '<span class="rec-badge-level ' + levelClass + '">' + level + '</span>' +
                    '</div>' +
                    (match !== null ? (
                        '<div class="rec-match-pill">' +
                            '<span class="rec-sparkle">✨</span>' +
                            '<span>' + esc(Math.round(match)) + '% Match</span>' +
                        '</div>'
                    ) : '') +
                '</div>' +

                '<div class="rec-card-body">' +
                    '<div class="rec-title-row">' +
                        '<span class="rec-icon">' + esc(r.icon || "🪐") + '</span>' +
                        '<h3 class="rec-event-title">' + esc(r.title) + '</h3>' +
                    '</div>' +

                    (reason ? (
                        '<div class="rec-why-box">' +
                            '<div class="rec-why-label">' +
                                '<span class="rec-sparkle">🤖</span>' +
                                '<span class="rec-ai-indicator">Personalized AI Match Analysis</span>' +
                            '</div>' +
                            '<p class="rec-why-text">"' + esc(reason) + '"</p>' +
                        '</div>'
                    ) : '') +

                    (topicsBadges ? (
                        '<div class="rec-matching-topics">' +
                            '<span>Key Topics:</span>' +
                            '<div class="rec-topics-tags">' + topicsBadges + '</div>' +
                        '</div>'
                    ) : '') +

                    '<div class="rec-info-strip">' +
                        '<span>📅 ' + esc(r.date || "") + '</span>' +
                        '<span>⏰ ' + esc(r.time || "") + '</span>' +
                        '<span>📍 ' + esc(r.location || "") + '</span>' +
                    '</div>' +
                '</div>' +

                '<div class="rec-card-footer">' +
                    '<span class="rec-seats">🔥 ' + esc(r.seats_left != null ? r.seats_left : 20) + ' seats remaining</span>' +
                    '<button type="button" class="btn btn-primary btn-micro" data-reg-id="' + esc(r.id) + '">' +
                        '<span>Reserve Pass 🎫</span>' +
                    '</button>' +
                '</div>' +
            '</article>'
        );
    }

    function goRegister(id) {
        if (typeof playTechTone === "function") {
            try { playTechTone("click"); } catch (_) {}
        }
        const sel = document.getElementById("event-select") || document.querySelector('select[name="event_id"], select[id*="event_id"], select[id*="event-id"]');
        if (sel) sel.value = String(id);
        const reg = document.getElementById("registration-section") || document.querySelector(".registration-section");
        if (reg) {
            reg.scrollIntoView({ behavior: "smooth" });
            const nameInput = document.getElementById("student-name");
            if (nameInput) setTimeout(function () { nameInput.focus(); }, 350);
        }
    }

    function init() {
        const section = document.querySelector(".personalize-section") || document.body;
        const btn = section.querySelector(".btn-recommend") || section.querySelector("button.btn-primary");
        if (!btn) {
            console.warn("recommend.js: button not found in the personalize section");
            return;
        }

        const grid = document.getElementById("recommendations-grid") || section.querySelector(".recommendations-grid");
        const emptyState = document.getElementById("rec-empty-state") || section.querySelector(".rec-empty-state");

        let box = document.getElementById("live-recommend-results");
        if (!box) {
            box = document.createElement("div");
            box.id = "live-recommend-results";
            box.style.display = "contents";
            if (grid) {
                grid.appendChild(box);
            } else {
                section.appendChild(box);
            }
        }

        section.addEventListener("click", function (e) {
            const target = e.target.closest("[data-reg-id]");
            if (target) goRegister(target.getAttribute("data-reg-id"));
        });

        btn.addEventListener("click", async function () {
            if (typeof playTechTone === "function") {
                try { playTechTone("pulse"); } catch (_) {}
            }

            // Read every ticked checkbox inside the Personalize section
            const interests = Array.from(
                section.querySelectorAll('#interest-checkboxes input:checked, input[type="checkbox"]:checked')
            ).map(function (c) { return c.value; });
            const uniqueInterests = Array.from(new Set(interests));

            const sel = section.querySelector("select");
            const text = sel ? sel.value + " " + sel.options[sel.selectedIndex].text : "";
            const level = ["Advanced", "Intermediate", "Beginner"].find(function (l) { return text.includes(l); }) || "Beginner";

            if (!uniqueInterests.length) {
                if (emptyState) {
                    emptyState.style.display = "block";
                    emptyState.innerHTML = '<div class="empty-icon">⚠️</div><h3>No Interests Selected</h3><p>Please check at least one interest chip above to generate personalized recommendations.</p>';
                }
                if (grid) grid.style.display = "none";
                box.innerHTML = '';
                return;
            }

            btn.disabled = true;
            if (emptyState) {
                emptyState.style.display = "block";
                emptyState.innerHTML = '<div class="empty-icon">⚡</div><h3>Synthesizing AI Recommendations...</h3><p>Matching your interest profile against upcoming workshops and computing difficulty alignment...</p>';
            }
            if (grid) grid.style.display = "none";
            box.innerHTML = '';

            try {
                const data = await callApi({ interests: uniqueInterests, skill_level: level });
                const list = data.recommendations || [];

                if (list.length > 0) {
                    if (emptyState) emptyState.style.display = "none";
                    if (grid) grid.style.display = "grid";
                    box.innerHTML = list.map(cardHtml).join("");
                    if (window.logDevTelemetry) {
                        window.logDevTelemetry("AI_ENGINE", "Synthesized " + list.length + " recommendations for [" + uniqueInterests.join(", ") + "] (" + level + ")", { count: list.length, top_match: list[0]?.title });
                    }
                } else {
                    if (emptyState) {
                        emptyState.style.display = "block";
                        emptyState.innerHTML = '<div class="empty-icon">🔍</div><h3>No Direct Matches</h3><p>Try selecting other interest categories to explore available workshops.</p>';
                    }
                    if (grid) grid.style.display = "none";
                }
            } catch (err) {
                if (emptyState) {
                    emptyState.style.display = "block";
                    emptyState.innerHTML = '<div class="empty-icon">⚠️</div><h3 style="color:#f43f5e">Backend Connection Failed</h3><p>Could not reach the FastAPI backend on port 8000. Please ensure the backend server is running: <code>uvicorn main:app --port 8000</code></p>';
                }
                if (grid) grid.style.display = "none";
            }
            btn.disabled = false;
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();