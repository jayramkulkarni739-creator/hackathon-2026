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
                console.warn("Backend unavailable; using local neural scoring engine:", err);
                const list = clientSideRecommend(uniqueInterests, level);
                if (emptyState) emptyState.style.display = "none";
                if (grid) grid.style.display = "grid";
                box.innerHTML = list.map(cardHtml).join("");
                if (window.logDevTelemetry) {
                    window.logDevTelemetry("AI_CLIENT_FALLBACK", "Synthesized " + list.length + " recommendations via client-side engine (web deployment mode)", { count: list.length, top_match: list[0]?.title });
                }
            }
            btn.disabled = false;
        });
    }

    function clientSideRecommend(interests, skillLevel) {
        const events = (typeof getFallbackEvents === "function") ? getFallbackEvents() : [
            { id: 1, title: "Full-Stack 3D Web Graphics & WebGL", category: "3D & Web", icon: "🪐", level: "Beginner", topics: ["3D/WebGL", "Web"], seats_left: 22, date: "2026-10-06", time: "4:00 PM - 6:00 PM", location: "Innovation Lab 3 & Spatial VR Stream" },
            { id: 2, title: "Autonomous AI Agents & Neural Architectures", category: "Artificial Intelligence", icon: "🤖", level: "Advanced", topics: ["AI/ML", "Data Science"], seats_left: 7, date: "2026-10-12", time: "3:00 PM - 5:30 PM", location: "Auditorium Hall Alpha" },
            { id: 3, title: "NovaHacks 2026: 24h Campus Hackathon", category: "Hackathon", icon: "⚡", level: "Intermediate", topics: ["Web", "AI/ML", "Cloud"], seats_left: 40, date: "2026-10-18", time: "9:00 AM - 6:00 PM", location: "NovaSphere Main Atrium" },
            { id: 4, title: "Cloud-Native DevOps & Container Matrix", category: "Cloud & DevOps", icon: "☁️", level: "Intermediate", topics: ["Cloud", "Cybersecurity"], seats_left: 15, date: "2026-10-24", time: "5:00 PM - 7:00 PM", location: "Virtual / Live Discord Stage" },
            { id: 5, title: "Zero-Trust Cybersecurity & Cryptography", category: "Security", icon: "🛡️", level: "Advanced", topics: ["Cybersecurity", "Cloud"], seats_left: 4, date: "2026-10-30", time: "4:30 PM - 6:30 PM", location: "Cybersecurity Sandbox Lab" },
            { id: 6, title: "Data Science & Predictive Modeling Lab", category: "Artificial Intelligence", icon: "📊", level: "Beginner", topics: ["Data Science", "AI/ML"], seats_left: 18, date: "2026-11-04", time: "2:00 PM - 4:00 PM", location: "Data Science Studio B" }
        ];

        const interestsLower = interests.map(function (i) { return i.toLowerCase().trim(); });
        const studentLevel = (skillLevel || "Beginner").trim();

        var scored = events.map(function (event) {
            const topics = event.topics || [];
            const matchingTopics = topics.filter(function (t) { return interestsLower.includes(t.toLowerCase()); });
            const topicMatchCount = matchingTopics.length;
            const levelMatch = (event.level || "Beginner").toLowerCase() === studentLevel.toLowerCase();
            const score = (topicMatchCount * 10) + (levelMatch ? 5 : 0);

            var calculatedPct = 35;
            if (interests.length > 0) {
                var overlap = topicMatchCount / Math.max(topics.length, 1);
                var basePct = overlap * 70;
                var bonusPct = levelMatch ? 25 : 5;
                calculatedPct = Math.round(basePct + bonusPct);
                if (topicMatchCount === 0) calculatedPct = levelMatch ? 30 : 15;
            } else {
                calculatedPct = levelMatch ? 75 : 35;
            }
            var matchPercentage = Math.min(98, Math.max(15, calculatedPct));

            var reason = "";
            if (matchingTopics.length > 0) {
                var topicsStr = matchingTopics.join(", ");
                reason = levelMatch
                    ? "Perfect match for your interest in " + topicsStr + ", crafted at your " + studentLevel + " skill level!"
                    : "Recommended for your interest in " + topicsStr + ", featuring practical exercises to advance your skills.";
            } else {
                reason = levelMatch
                    ? "Aligned with your " + studentLevel + " skill level to help you explore new tech horizons."
                    : "Great workshop in " + event.category + " to broaden your developer toolkit.";
            }

            return Object.assign({}, event, {
                score: score,
                match_percentage: matchPercentage,
                reason: reason,
                matching_topics: matchingTopics
            });
        });

        scored.sort(function (a, b) {
            return b.score - a.score || b.match_percentage - a.match_percentage;
        });
        return scored;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();