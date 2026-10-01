// recommend.js - connects the "Recommend for me" button to POST /api/recommend
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
        const topics = Array.isArray(r.topics) ? r.topics.join(", ") : "";
        return (
            '<div style="border:1px solid rgba(0,229,255,.35);border-radius:14px;padding:16px;margin-top:12px;background:rgba(255,255,255,.04)">' +
            '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
            "<strong>" + esc(r.icon || "") + " " + esc(r.title) + "</strong>" +
            (match !== null ? '<span style="color:#00e5ff;font-weight:700">' + esc(Math.round(match)) + "% match</span>" : "") +
            "</div>" +
            '<div style="opacity:.8;margin-top:6px;font-size:.9rem">' +
            esc(r.date || "") + " " + esc(r.time || "") + " | " + esc(r.location || "") + " | Level: " + esc(r.level || "") +
            "</div>" +
            (topics ? '<div style="margin-top:6px;font-size:.85rem">Topics: ' + esc(topics) + "</div>" : "") +
            (reason ? '<p style="margin:10px 0 0">&#10024; ' + esc(reason) + "</p>" : "") +
            '<button type="button" class="btn btn-primary" data-reg-id="' + esc(r.id) + '" style="margin-top:12px">Register</button>' +
            "</div>"
        );
    }

    function goRegister(id) {
        const sel = document.querySelector('select[name="event_id"], select[id*="event_id"], select[id*="event-id"]');
        if (sel) sel.value = String(id);
        const reg = document.getElementById("registration-section") || document.querySelector(".registration-section");
        if (reg) reg.scrollIntoView({ behavior: "smooth" });
    }

    function init() {
        const section = document.querySelector(".personalize-section") || document.body;
        const btn = section.querySelector(".btn-recommend") || section.querySelector("button.btn-primary");
        if (!btn) {
            console.warn("recommend.js: button not found in the personalize section");
            return;
        }

        const box = document.createElement("div");
        box.id = "live-recommend-results";
        section.appendChild(box);

        box.addEventListener("click", function (e) {
            const target = e.target.closest("[data-reg-id]");
            if (target) goRegister(target.getAttribute("data-reg-id"));
        });

        btn.addEventListener("click", async function () {
            // Read every ticked checkbox inside the Personalize section
            const interests = Array.from(
                section.querySelectorAll('#interest-checkboxes input:checked, input[type="checkbox"]:checked')
            ).map(function (c) { return c.value; });
            const uniqueInterests = Array.from(new Set(interests));

            const sel = section.querySelector("select");
            const text = sel ? sel.value + " " + sel.options[sel.selectedIndex].text : "";
            const level = ["Advanced", "Intermediate", "Beginner"].find(function (l) { return text.includes(l); }) || "Beginner";

            if (!uniqueInterests.length) {
                box.innerHTML = '<p style="margin-top:12px">Please select at least one interest.</p>';
                return;
            }

            btn.disabled = true;
            box.innerHTML = '<p style="margin-top:12px">Finding the best events for you...</p>';
            try {
                const data = await callApi({ interests: uniqueInterests, skill_level: level });
                const list = data.recommendations || [];
                box.innerHTML = list.length
                    ? list.map(cardHtml).join("")
                    : '<p style="margin-top:12px">No matching events. Try other interests.</p>';
            } catch (err) {
                box.innerHTML = '<p style="margin-top:12px;color:#ff6b6b">Could not reach the backend. Is it running on port 8000?</p>';
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