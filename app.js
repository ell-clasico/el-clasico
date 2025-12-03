/* ==========================================================
   V17 PRO — GLOBAL OPTIMIZED (TEK DOSYA)
========================================================== */

const upload = Upload({
    apiKey: "public_G22nj4G4oJqYwoLB52gv3yHBP462"
});

const DEFAULT_PHOTO = "https://i.hizliresim.com/hw8yfje.png";
let currentUser = null;
const db = firebase.firestore();
const FORMA_A = "https://i.hizliresim.com/1qy6nk5.png";
const FORMA_B = "https://i.hizliresim.com/82yu2gw.png"; 
let selects = {};
let multiSelects = {};

// ==========================================================
// GLOBAL CACHE — TÜM VERİLERİ 1 KERE ÇEKER
// ==========================================================

let CACHE = {
    players: [],
    ratings: [],
    ga: [],
    winners: []
};
/* ============================================
   FM24 MEVKİ SEÇİM — PERFECT RESET SYSTEM
============================================ */
/* ============================================
   FM24 MEVKİ SEÇİM — 3. MEVKİ ENGELLİ FINAL
============================================ */
let mainPos = null;
let subPos = null;
const POS_MAP = {
    "ST": "Santrafor",
    "CM": "Merkez Orta",
    "LW": "Sol Kanat",
    "RW": "Sağ Kanat",
    "LB": "Sol Bek",
    "CB": "Stoper",
    "RB": "Sağ Bek",
    "GK": "Kaleci"
};

const POS_MAP_REVERSE = {
    "Kaleci": "GK",
    "Sol Bek": "LB",
    "Stoper": "CB",
    "Sağ Bek": "RB",
    "Sol Kanat": "LW",
    "Sağ Kanat": "RW",
    "Merkez Orta": "CM",
    "Santrafor": "ST"
};


document.querySelectorAll(".fm-card").forEach(card => {
    card.onclick = () => {

        const posCode = card.dataset.pos;      // LB, RW, ST
        const posName = card.dataset.name;     // Sol Bek, Sağ Kanat

        const mainPos = document.getElementById("mainPos").value;
        const subPos  = document.getElementById("subPos").value;

        // Aynı karta yeniden tıklarsa kaldır
        if (card.classList.contains("selected-main")) {
            document.getElementById("mainPos").value = "";
            card.classList.remove("selected-main");
            return;
        }
        if (card.classList.contains("selected-sub")) {
            document.getElementById("subPos").value = "";
            card.classList.remove("selected-sub");
            return;
        }

        // 3. seçim engellemesi
        if (mainPos && subPos) {
            notify("3. mevki seçilmesine izin verilmiyor.");
            return;
        }

        // Ana mevki
        if (!mainPos) {
            document.getElementById("mainPos").value = posName;  // TÜRKÇE KAYIT
            card.classList.add("selected-main");
            return;
        }

        // Yedek mevki
        if (!subPos) {
            document.getElementById("subPos").value = posName;   // TÜRKÇE KAYIT
            card.classList.add("selected-sub");
            return;
        }
    };
});









// Tek seferde tüm verileri yükler
async function refreshCache() {
    const [p, r, g, w] = await Promise.all([
        db.collection("players").get(),
        db.collection("ratings").get(),
        db.collection("ga").get(),
        db.collection("winners").get()
    ]);

    CACHE.players = p.docs.map(d => ({ id: d.id, ...d.data() }));
    CACHE.ratings = r.docs.map(d => ({ id: d.id, ...d.data() }));
    CACHE.ga = g.docs.map(d => ({ id: d.id, ...d.data() }));
    CACHE.winners = w.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ==========================================================
// NOTIFICATION
// ==========================================================
function notify(msg = "Kaydedildi") {
    const n = document.getElementById("notify");
    n.innerText = msg;
    n.style.display = "block";
    setTimeout(() => (n.style.display = "none"), 2000);
}

// ==========================================================
// CUSTOM SELECT ENGINE
// ==========================================================
document.addEventListener("click", e => {
    document.querySelectorAll(".custom-options").forEach(opt => {
        if (!opt.parentElement.contains(e.target)) opt.style.display = "none";
    });
});

function buildSingleSelect(wrapper, items) {
    const display = wrapper.querySelector(".custom-display");
    const options = wrapper.querySelector(".custom-options");

    options.innerHTML = "";
    let selected = null;

    items.forEach(name => {
        let div = document.createElement("div");
        div.className = "custom-option";
        div.innerText = name;

        div.onclick = () => {
            selected = name;
            display.innerText = name;
            options.style.display = "none";
        };

        options.appendChild(div);
    });

    display.onclick = () => {
        options.style.display = options.style.display === "block" ? "none" : "block";
    };

    return {
        get value() {
            return selected;
        },
        reset() {
            selected = null;
            display.innerText = "Seç";
        }
    };
}
async function addPlayer() {
    let name = document.getElementById("newPlayerName").value.trim();
    let file = document.getElementById("newPlayerPhoto").files[0];

    if (!name) return;

    let photoURL = DEFAULT_PHOTO;

    if (file) {
        const uploaded = await upload.uploadFile(file);
        photoURL = uploaded.fileUrl;
    }

    await db.collection("players").add({ name, photo: photoURL });

    document.getElementById("newPlayerName").value = "";
    document.getElementById("newPlayerPhoto").value = "";

    loadAll();
    notify("Oyuncu Eklendi");
}


// ==========================================================
// PAGE SYSTEM
// ==========================================================
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });

    const page = document.getElementById(id);
    page.style.display = "block";
    page.classList.add("active");

    if (currentUser === "ADMIN" && id === "profilim") {
        alert("Admin için profil bölümü kapalı.");
        return;
    }
console.log("AÇILAN SAYFA:", id);
    if (id === "profilim") {
        loadProfil();
    }

    // ⭐ KADRO SAYFASI AÇILDIĞINDA
    if (id === "kadro") {
        loadKadroPlayerGrid();
      
    }
if (id === "haftaninKadro") {
    loadHaftaninKadro();
}

    if (id !== "login") {
        localStorage.setItem("hsPage", id);
    }
}



// ==========================================================
// PROFIL
// ==========================================================
async function loadProfil() {
    if (!currentUser || currentUser === "ADMIN") return;

    const p = CACHE.players.find(x => x.name === currentUser);
    if (!p) return;
console.log("🧩 PROFIL PLAYER:", p);
    console.log("➡️ mainPos:", p.mainPos);
    console.log("➡️ subPos:", p.subPos);
    console.log("➡️ Taban Statlar:", p.stats);
    // Karttaki fotoğraf, isim, pozisyon
  
    document.getElementById("fifa-name").textContent = p.name;
    document.getElementById("fifa-position").textContent = p.mainPos || "-";

    // Statlar
    const stats = p.stats || {
        sut:0,pas:0,kondisyon:0,hiz:0,fizik:0,defans:0,oyunGorusu:0
    };

    // Tüm kartı çiz
    renderFifaCard({ ...p, stats });

    // Mevki inputlarına yaz
    document.getElementById("mainPos").value = p.mainPos || "";
    document.getElementById("subPos").value = p.subPos || "";
	
highlightSavedPositions(p.mainPos, p.subPos);
}







function markSelectedCards() {
    const main = document.getElementById("mainPos").value;
    const sub  = document.getElementById("subPos").value;

    cards.forEach(card => {
        card.classList.remove("selected-main", "selected-sub");

        if (card.dataset.name === main)
            card.classList.add("selected-main");

        if (card.dataset.name === sub)
            card.classList.add("selected-sub");
    });
}

function highlightSavedPositions(mainPos, subPos) {

    document.querySelectorAll(".fm-card").forEach(c => {
        c.classList.remove("selected-main", "selected-sub");
    });

    if (mainPos) {
        const code = POS_MAP_REVERSE[mainPos];  
        const el = document.querySelector(`.fm-card[data-pos="${code}"]`);
        if (el) el.classList.add("selected-main");
    }

    if (subPos) {
        const code = POS_MAP_REVERSE[subPos];
        const el = document.querySelector(`.fm-card[data-pos="${code}"]`);
        if (el) el.classList.add("selected-sub");
    }
}




// ==========================================================
// LOGIN
// ==========================================================
async function login() {
    let name = selects["loginUser"]?.value;
    if (!name) return alert("Kullanıcı seç!");

    if (name === "ADMIN") {
        return alert("ADMIN girişi için şifreli giriş yap!");
    }

    currentUser = name;
    localStorage.setItem("hsUser", name);

    hideAdminButtons();
    openApp();
    notify("Giriş Yapıldı");
}

async function adminLogin() {
    let pass = document.getElementById("adminPass").value;
    if (pass !== "2611") return alert("Hatalı şifre!");

    currentUser = "ADMIN";
    localStorage.setItem("hsUser", "ADMIN");

    hideAdminButtons();
    showAdminButtons();

    openApp();
    notify("Admin Girişi");
}

function showAdminButtons() {
    document.getElementById("adminBtn").style.display = "inline-block";
    document.getElementById("gaBtn").style.display = "inline-block";
    document.getElementById("winBtn").style.display = "inline-block";
}
function hideAdminButtons() {
    document.getElementById("adminBtn").style.display = "none";
    document.getElementById("gaBtn").style.display = "none";
    document.getElementById("winBtn").style.display = "none";
}

// ==========================================================
// APP OPEN
// ==========================================================
async function openApp() {
    document.getElementById("login").style.display = "none";
    document.getElementById("navbar").style.display = "flex";

    hideAdminButtons();
    if (currentUser === "ADMIN") showAdminButtons();

    document.getElementById("profilBtn").style.display =
        currentUser === "ADMIN" ? "none" : "inline-block";
document.getElementById("kadroBtn").style.display =
    currentUser === "ADMIN" ? "inline-block" : "none";
    await loadAll();

    let savedPage = localStorage.getItem("hsPage") || "oyuncular";
    setTimeout(() => showPage(savedPage), 150);
}

// ==========================================================
// SELECT SETUP
// ==========================================================
async function setupSelects() {
    const list = CACHE.players.map(d => d.name);

    selects["loginUser"] = buildSingleSelect(
        document.querySelector('[data-id="loginUser"]'),
        [...list, "ADMIN"]
    );

    selects["puanTarget"] = buildSingleSelect(
        document.querySelector('[data-id="puanTarget"]'),
        list
    );

    selects["deleteUser"] = buildSingleSelect(
        document.querySelector('[data-id="deleteUser"]'),
        list
    );

    selects["gaPlayer"] = buildSingleSelect(
        document.querySelector('[data-id="gaPlayer"]'),
        list
    );

   
}

// ==========================================================
// DOM LOADED
// ==========================================================
window.addEventListener("DOMContentLoaded", async () => {
    let savedUser = localStorage.getItem("hsUser");

    if (!savedUser || savedUser === "null" || savedUser.trim() === "") {
        currentUser = null;

        document.getElementById("navbar").style.display = "none";

        document.querySelectorAll(".page").forEach(p => {
            p.classList.remove("active");
            p.style.display = "none";
        });

        const loginPage = document.getElementById("login");
        loginPage.style.display = "block";
        loginPage.classList.add("active");

        await refreshCache();
        await setupSelects();

        return;
    }

    currentUser = savedUser.trim();
    await openApp();
});

// ==========================================================
// LOAD ALL DATA
// ==========================================================
async function loadAll() {
    await refreshCache();
    await loadPlayers();
    await loadGecmis();
    await loadGolKr();
    await loadKazananlar();
    await loadEnIyi();
    await setupSelects();
}

// ==========================================================
// OYUNCULAR
// ==========================================================
async function loadPlayers() {
    const box = document.getElementById("oyuncuListe");
    box.innerHTML = "";

    // Pozisyon sırası (normalize edilmiş kodlara göre)
    const posOrder = ["GK","LB","CB","RB","CM","LW","RW","ST",""];

    let sortedPlayers = [...CACHE.players].sort((a, b) => {

        // Türkçe pozisyonu normalize ediyoruz
        let pa = normalizePos(a.mainPos) || "";
        let pb = normalizePos(b.mainPos) || "";

        let orderA = posOrder.indexOf(pa);
        let orderB = posOrder.indexOf(pb);

        // farklı pozisyon ise sıralama
        if (orderA !== orderB) return orderA - orderB;

        // aynı pozisyon ise alfabetik
        return (a.name || "").localeCompare(b.name || "");

    });

    // Listeyi ekrana bas
    sortedPlayers.forEach(p => {
        const photo = p.photo || DEFAULT_PHOTO;

        box.innerHTML += `
            <div class="card">
                <img src="${photo}">
                <h3>${p.name}</h3>

                <div class="player-pos">
                    <p><strong>Asıl Mevki:</strong> ${p.mainPos || '-'}</p>
                    <p><strong>Yedek Mevki:</strong> ${p.subPos || '-'}</p>
                </div>

                ${
                    currentUser === "ADMIN"
                        ? `<button class="rate-btn" onclick="openRatePanel('${p.id}', '${p.name}')">Puanla</button>`
                        : ``
                }
            </div>
        `;
    });
}






// ==========================================================
// PUAN GÖNDER
// ==========================================================
async function puanGonder() {
    let hedef = selects["puanTarget"].value;
    let val = Number(document.getElementById("puanValue").value);

    if (!hedef) return alert("Oyuncu seç!");
    if (!val || val < 1 || val > 10) return alert("1-10 arası puan!");
    if (hedef === currentUser) return alert("Kendine puan veremezsin!");
    if (!Number.isInteger(val)) return alert("Puan tam sayı olmalı!");
    let kontrol = CACHE.ratings.filter(
        r => r.from === currentUser && r.to === hedef
    )[0];

    if (kontrol) {
        let lastDate = new Date(kontrol.date);
        let diffDays = Math.floor((Date.now() - lastDate) / 86400000);

        if (diffDays < 5) {
            return alert(`Tekrar puan verebilmek için ${5 - diffDays} gün daha bekle.`);
        }
    }

    await db.collection("ratings").add({
        from: currentUser,
        to: hedef,
        score: val,
        date: new Date().toISOString()
    });

    await refreshCache();
    await loadGecmis();
    await loadEnIyi();

    document.getElementById("puanValue").value = "";
    notify("Puan Gönderildi");
}

// ==========================================================
// GEÇMİŞ
// ==========================================================
async function loadGecmis() {
    const list = document.getElementById("gecmisList");
    list.innerHTML = "";

    let sorted = [...CACHE.ratings].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    sorted.forEach(r => {
        list.innerHTML += `
            <li>${r.from} → ${r.to} | ${r.score} puan | ${r.date.slice(0, 10)}</li>
        `;
    });
}

// ==========================================================
// OYUNCU SİL
// ==========================================================
async function deletePlayer() {
    let name = selects["deleteUser"].value;
    if (!name) return alert("Oyuncu seç!");

    let p = CACHE.players.find(x => x.name === name);
    if (p) await db.collection("players").doc(p.id).delete();

    CACHE.ratings
        .filter(x => x.from === name || x.to === name)
        .forEach(r => db.collection("ratings").doc(r.id).delete());

    CACHE.ga
        .filter(x => x.name === name)
        .forEach(g => db.collection("ga").doc(g.id).delete());

    CACHE.winners.forEach(w => {
        if (w.players.includes(name)) {
            let arr = w.players.filter(x => x !== name);
            db.collection("winners").doc(w.id).update({ players: arr });
        }
    });

    await loadAll();
    notify("Oyuncu Silindi");
}

// ==========================================================
// GOL-ASİST EKLE
// ==========================================================
async function ekleGolAsist() {
    let name = selects["gaPlayer"].value;
    let gol = Number(document.getElementById("gaGol").value);

    if (!name) return alert("Oyuncu seç!");

    let p = CACHE.players.find(x => x.name === name);

    await db.collection("ga").add({
        name,
        gol,
        photo: p?.photo || DEFAULT_PHOTO
    });

    document.getElementById("gaGol").value = "";

    await loadAll();
    notify("Kaydedildi");
}

// ==========================================================
// GOL KRALLIĞI
// ==========================================================
async function loadGolKr() {
    const box = document.getElementById("golList");
    box.innerHTML = "";

    let map = {};

    CACHE.ga.forEach(g => {
        if (!map[g.name]) map[g.name] = { gol: 0, photo: g.photo };
        map[g.name].gol += Number(g.gol);   // 🔥 kesin çözüm
    });

    let arr = Object.entries(map).map(([name, data]) => ({
        name,
        photo: data.photo,
        gol: data.gol
    }));

    // 0 olanları gizle + sırala
    arr = arr
        .filter(p => p.gol > 0)
        .sort((a, b) => b.gol - a.gol);

    arr.forEach(p => {
        box.innerHTML += `
            <div class="kr-item">
                <div class="kr-left">
                    <img class="kr-photo" src="${p.photo}">
                    <div class="kr-name">${p.name}</div>
                </div>
                <div class="kr-score">${p.gol}</div>
            </div>
        `;
    });
}



// ==========================================================
// EN İYİ OYUNCULAR — MEGA OPTIMIZED
// ==========================================================
async function loadEnIyi() {
    const box = document.getElementById("eniyiList");
    box.innerHTML = "";

    let arr = [];

    CACHE.players.forEach(player => {
        let name = player.name;
        let photo = player.photo || DEFAULT_PHOTO;

        // PUAN TOPLAMI
        let userRatings = CACHE.ratings.filter(r => r.to === name);
        let totalPoints = userRatings.reduce((t, r) => t + Number(r.score), 0);

        // GOL + ASİST TOPLAMI
        let userGA = CACHE.ga.filter(g => g.name === name);
        let totalGol = userGA.reduce((t, g) => t + Number(g.gol), 0);


        // KAZANAN SAYISI
        let winCount = CACHE.winners.filter(w => w.players.includes(name)).length;

        // FİNAL PUAN
        let finalScore =
            totalPoints +
            (totalGol * 2) +
            (winCount * 5);

        arr.push({
            name,
            photo,
            total: finalScore
        });
    });

    // 0 PUANLILARI KALDIR + SIRALA
    arr = arr
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total);

    // EKRANA BAS
    arr.forEach(p => {
        box.innerHTML += `
            <div class="kr-item">
                <div class="kr-left">
                    <img class="kr-photo" src="${p.photo}">
                    <div class="kr-name">${p.name}</div>
                </div>
                <div class="kr-score">${p.total.toFixed(1)}</div>
            </div>
        `;
    });
}




// ==========================================================
// KAZANANLAR
// ==========================================================
async function loadKazananlar() {
    const box = document.getElementById("kazananList");
    box.innerHTML = "";

    let winMap = {};

    CACHE.winners.forEach(w => {
        w.players.forEach(name => {
            if (!winMap[name]) winMap[name] = 0;
            winMap[name]++;
        });
    });

    let arr = CACHE.players
        .map(p => ({
            name: p.name,
            photo: p.photo || DEFAULT_PHOTO,
            total: winMap[p.name] || 0
        }))
        .filter(p => p.total > 0);

    arr.sort((a, b) => b.total - a.total);

    arr.forEach(p => {
        box.innerHTML += `
            <div class="kr-item">
                <div class="kr-left">
                    <img class="kr-photo" src="${p.photo}">
                    <div class="kr-name">${p.name}</div>
                </div>
                <div class="kr-score">${p.total}</div>
            </div>
        `;
    });
}

// ==========================================================
// KAZANAN KAYDET
// ==========================================================
async function kazananKaydet() {
    let arr = multiSelects["winnerSelect"].values;
    if (!arr.length) return alert("Oyuncu seç!");

    await db.collection("winners").add({
        players: arr,
        date: new Date().toISOString()
    });

    await loadAll();
    notify("Kaydedildi");
}

// ==========================================================
// LOGOUT
// ==========================================================
function logout() {
    window.stop();

    localStorage.removeItem("hsUser");
    localStorage.removeItem("hsPage");
    currentUser = null;

    hideAdminButtons();
    document.getElementById("navbar").style.display = "none";

    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });

    const loginPage = document.getElementById("login");
    loginPage.style.display = "block";
    loginPage.classList.add("active");

    notify("Çıkış Yapıldı");
}
async function updatePhoto() {
    const fileInput = document.getElementById("profilUpload");
    const file = fileInput.files[0];

    if (!file) {
        notify("Lütfen bir dosya seç!");
        return;
    }

    const btn = document.querySelector('button[onclick="updatePhoto()"]');
    btn.classList.add("loading");

    try {
        const { fileUrl } = await upload.uploadFile(file);

        let p = CACHE.players.find(x => x.name === currentUser);
        if (p) {
            await db.collection("players").doc(p.id).update({
                photo: fileUrl
            });

            // Karttaki fotoğrafı anında güncelle
            document.getElementById("fifa-photo").src = fileUrl;

            renderFifaCard({
                ...p,
                photo: fileUrl
            });
        }

        notify("Fotoğraf Güncellendi");
    } catch (e) {
        notify("Fotoğraf Güncellendi");
    }

    btn.classList.remove("loading");
}
document.getElementById("selectFileBtn").onclick = () => {
    document.getElementById("profilUpload").click();
};




async function savePositions() {

    const mainP = document.getElementById("mainPos").value;
    const subP  = document.getElementById("subPos").value;

    let p = CACHE.players.find(x => x.name === currentUser);

    await db.collection("players").doc(p.id).update({
        mainPos: mainP,
        subPos: subP
    });

    notify("Mevkiler Kaydedildi");

    // PROFİL KARTINI YENİLE
    await refreshCache();
    const updated = CACHE.players.find(x => x.name === currentUser);
    if (updated) renderFifaCard(updated);
}


function renderStars(elId, value) {
    const el = document.getElementById(elId);
    el.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const span = document.createElement("span");
        span.textContent = "★";
        if (i <= value) span.classList.add("active");
        el.appendChild(span);
    }
}


// Firebase'den stat çekildikten sonra:
function loadPlayerStats(stats) {
    renderStars("stat-sut", stats.sut);
    renderStars("stat-pas", stats.pas);
    renderStars("stat-kondisyon", stats.kondisyon);
    renderStars("stat-hiz", stats.hiz);
    renderStars("stat-fizik", stats.fizik);
    renderStars("stat-defans", stats.defans);
    renderStars("stat-oyunGorusu", stats.oyunGorusu);
}

function openRatePanel(id, name) {
    selectedPlayerId = id;

    document.getElementById("ratePlayerName").textContent = name;
    document.getElementById("rateModal").style.display = "flex";

    // Eski değerleri doldur
    const p = CACHE.players.find(x => x.id === id);
    const s = p.stats || {};

    document.getElementById("rate-sut").value = s.sut ?? 0;
    document.getElementById("rate-pas").value = s.pas ?? 0;
    document.getElementById("rate-kond").value = s.kondisyon ?? 0;
    document.getElementById("rate-hiz").value = s.hiz ?? 0;
    document.getElementById("rate-fizik").value = s.fizik ?? 0;
    document.getElementById("rate-def").value = s.defans ?? 0;
    document.getElementById("rate-oyunGorusu").value = s.oyunGorusu ?? 0;
}


function closeRatePanel() {
    document.getElementById("rateModal").style.display = "none";
}

document.getElementById("saveRating").onclick = async () => {
    console.log("⭐ Kaydet tıklandı, oyuncu ID:", selectedPlayerId);

    // 1) Popup’tan alınan taban statlar
    let baseStats = {
        sut: Number(document.getElementById("rate-sut").value),
        pas: Number(document.getElementById("rate-pas").value),
        kondisyon: Number(document.getElementById("rate-kond").value),
        hiz: Number(document.getElementById("rate-hiz").value),
        fizik: Number(document.getElementById("rate-fizik").value),
        defans: Number(document.getElementById("rate-def").value),
        oyunGorusu: Number(document.getElementById("rate-oyunGorusu").value)
    };

    console.log("📊 TABAN STATLAR:", baseStats);

    // 2) Firebase'e SADECE taban statları yazıyoruz
    await db.collection("players")
        .doc(selectedPlayerId)
        .update({ stats: baseStats });

    console.log("💾 Firestore taban statlarla güncellendi");

    await refreshCache();
    closeRatePanel();
    notify("Puanlar Kaydedildi");

    // Profil kartını güncelle
    const updatedPlayer = CACHE.players.find(x => x.id === selectedPlayerId);
    if (updatedPlayer.name === currentUser) {
        renderFifaCard({ ...updatedPlayer });
    }
};




function renderFifaCard(p) {

    const base = p.stats || {
        sut: 0, pas: 0, kondisyon: 0, hiz: 0,
        fizik: 0, defans: 0, oyunGorusu: 0
    };

    // BONUS uygulanmış statlar
    const applied = applyMatchBonus(p, base);

    // 📌 BONUSLU OVR HESABI TEK YERDEN
    const ovr = getOVR_withBonus(p);

    // Karta yaz
    document.getElementById("fifa-name").textContent = p.name || "-";
    document.getElementById("fifa-position").textContent = p.mainPos || "-";
    document.getElementById("fifa-overall").textContent = ovr;

    // Bonus kontrol fonksiyonu
    const isBonus = (key) => applied[key] !== base[key];

    // Stat yazma + glow efekti
    const writeStat = (id, key) => {
        const el = document.getElementById(id);
        el.textContent = applied[key];

        if (isBonus(key)) el.classList.add("bonus-glow");
        else el.classList.remove("bonus-glow");
    };

    writeStat("fifa-hiz", "hiz");
    writeStat("fifa-sut", "sut");
    writeStat("fifa-pas", "pas");
    writeStat("fifa-kondisyon", "kondisyon");
    writeStat("fifa-defans", "defans");
    writeStat("fifa-fizik", "fizik");
}








async function loadPlayersIntoKadroUI() {
    const snap = await db.collection("players").get();

    const players = [];
    snap.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() });
    });

    // Custom Multi (16 oyuncu)
    const multiContainer = document.querySelector('#kadroPlayersSelect .custom-options');
    multiContainer.innerHTML = "";
    players.forEach(p => {
        multiContainer.innerHTML += `
            <div class="option" data-value="${p.id}">${p.name}</div>
        `;
    });

    // A takımı kaleci
    const gkA = document.querySelector('#gkASelect .custom-options');
    const gkB = document.querySelector('#gkBSelect .custom-options');

    gkA.innerHTML = "";
    gkB.innerHTML = "";

    players.forEach(p => {
        gkA.innerHTML += `<div class="option" data-value="${p.id}">${p.name}</div>`;
        gkB.innerHTML += `<div class="option" data-value="${p.id}">${p.name}</div>`;
    });

    // Custom select JS’ini yeniden tetiklemek için:
    initCustomSelects();
}

let selectedPlayers = [];

/* 16 oyuncu gridini yükle */
async function loadKadroPlayerGrid() {
    const snap = await db.collection("players").get();

    const grid = document.getElementById("kadroPlayerGrid");
    grid.innerHTML = "";
    selectedPlayers = [];

    snap.forEach(doc => {
        const p = doc.data();
        const id = doc.id;

        const div = document.createElement("div");
        div.className = "player-item";
        div.innerText = p.name;
        div.dataset.id = id;

        div.addEventListener("click", () => {
            if (div.classList.contains("selected")) {
                div.classList.remove("selected");
                selectedPlayers = selectedPlayers.filter(x => x !== id);
            } else {
                if (selectedPlayers.length >= 16) {
                    alert("En fazla 16 oyuncu seçebilirsin!");
                    return;
                }
                div.classList.add("selected");
                selectedPlayers.push(id);
            }
            updateGKDropdowns();
        });

        grid.appendChild(div);
    });
}

/* Kaleci dropdownlarını güncelle */
function updateGKDropdowns() {
    const gkA = document.querySelector("#gkASelect .custom-options");
    const gkB = document.querySelector("#gkBSelect .custom-options");

    gkA.innerHTML = "";
    gkB.innerHTML = "";

    selectedPlayers.forEach(id => {
        const p = CACHE.players.find(x => x.id === id);
        if (!p) return;

        gkA.innerHTML += `<div class="option" data-id="${id}">${p.name}</div>`;
        gkB.innerHTML += `<div class="option" data-id="${id}">${p.name}</div>`;
    });

    initCustomSelects();
}

/* Custom Select Setup */
function initCustomSelects() {
    document.querySelectorAll(".custom-select").forEach(sel => {
        const display = sel.querySelector(".custom-display");
        const options = sel.querySelector(".custom-options");

        display.onclick = () => {
            let isOpen = options.style.display === "block";
            document.querySelectorAll(".custom-options").forEach(o => o.style.display = "none");
            options.style.display = isOpen ? "none" : "block";
        };

        options.querySelectorAll(".option").forEach(opt => {
            opt.onclick = () => {
                display.innerText = opt.innerText;
                sel.dataset.value = opt.dataset.id;
                options.style.display = "none";

                // GK A seçildi
                if (sel.id === "gkASelect") {
                    selectGKA(opt.dataset.id, opt.innerText);
                }

                // GK B seçildi
                if (sel.id === "gkBSelect") {
                    selectGKB(opt.dataset.id, opt.innerText);
                }
            };
        });
    });
}

/* ===============================
   POZİSYON NORMALİZASYONU
================================ */
function normalizePos(posName) {

    if (!posName) return null;
	posName = posName.toString().trim().toLowerCase();
    let p = posName
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const map = {
        "kaleci": "GK",

        "sol bek": "LB",
        "sağ bek": "RB",
        "sag bek": "RB",

        "stoper": "CB",
        "cb": "CB",
        "cb-r": "CB",

        "sol kanat": "LW",
        "sağ kanat": "RW",
        "sag kanat": "RW",

        "merkez orta": "CM",
        "cm": "CM",
        "cm-r": "CM",

        "santrafor": "ST",
        "forvet": "ST"
    };

    return map[p] || null;
}





/* ===============================
   OVR Hesaplama
================================ */
function getOVR(player) {
    if (!player) return 0;

    const applied = applyMatchBonus(player, player.stats || {});

    return Math.round(
        (
            (applied.sut||0) +
            (applied.pas||0) +
            (applied.kondisyon||0) +
            (applied.hiz||0) +
            (applied.fizik||0) +
            (applied.oyunGorusu||0) +
            (applied.defans||0)
        ) / 7
    );
}


function getPlayerPositions(p) {
    return {
        id: p.id,
        name: p.name,
    main: mapPosition(p.mainPos),   // normalize ile karıştırma
        sub: mapPosition(p.subPos),
        ovr: p.matchOVR              // BONUSLU OVR
    };
}




/* ==========================================================
   TAKIM DENGELEYİCİ (OVR BALANCER)
========================================================== */
function balanceTeams(teamA, teamB, posMap) {

    const getPlayer = id => CACHE.players.find(p => p.id === id);

    // ❗ SADECE BONUSLU OVR KULLAN — yeniden hesaplama YASAK
    const getOVR = p => (p?.matchOVR ?? 0);

    const sum = arr => arr.reduce((t, id) => t + getOVR(getPlayer(id)), 0);

    let attempts = 0;

    while (attempts++ < 120) {

        let sumA = sum(teamA);
        let sumB = sum(teamB);
        let diff = sumA - sumB;

        // hedef fark
        if (Math.abs(diff) <= 15) break;

        let strong = diff > 0 ? teamA : teamB;
        let weak   = diff > 0 ? teamB : teamA;

        let bestSwap = null;
        let bestImpact = Infinity;

        // EN İYİ SWAP’I ARIYORUZ
        for (let sid of strong) {

            // ❌ GK ASLA TAKIM DEĞİŞTİREMEZ
            if (sid === posMap["GK"] || sid === posMap["GK2"]) continue;

            const sp = getPlayer(sid);
            const sOvr = getOVR(sp);

            for (let wid of weak) {

                // ❌ GK ASLA TAKIM DEĞİŞTİREMEZ
                if (wid === posMap["GK"] || wid === posMap["GK2"]) continue;

                const wp = getPlayer(wid);
                const wOvr = getOVR(wp);

                let newA = sumA - sOvr + wOvr;
                let newB = sumB - wOvr + sOvr;
                let impact = Math.abs(newA - newB);

                if (impact < bestImpact) {
                    bestImpact = impact;
                    bestSwap = { sid, wid };
                }
            }
        }

        if (!bestSwap) break;

        const { sid, wid } = bestSwap;

        // swap uygula
        strong.splice(strong.indexOf(sid), 1);
        weak.splice(weak.indexOf(wid), 1);
        strong.push(wid);
        weak.push(sid);

        // POSMAP güncelleme
        for (let k in posMap) {
            if (posMap[k] === sid) posMap[k] = wid;
            else if (posMap[k] === wid) posMap[k] = sid;
        }
    }

    return { teamA, teamB, posMap };
}






/* ==========================================================
   ANA TAKIM OLUŞTURUCU — DENGELİ SÜRÜM
========================================================== */
function computeOVR(s) {
    return Math.round(
        (
            (s.sut||0) +
            (s.pas||0) +
            (s.kondisyon||0) +
            (s.hiz||0) +
            (s.fizik||0) +
            (s.defans||0) +
            (s.oyunGorusu||0)
        ) / 7
    );
}

function preparePlayerForMatch(p) {
    const bonusStats = applyMatchBonus(p, p.stats);
    p.matchStats = bonusStats;
    p.matchOVR = getOVR(p);
    return p;
}

function buildBalancedTeams(selectedPlayers, gkA, gkB) {

    const POS_ORDER = ["ST", "RW", "LW", "CM", "LB", "RB", "CB"];

    let teamA = [gkA];
    let teamB = [gkB];
	// GK’ları da maç için hazırla!!!
let gkPlayerA = CACHE.players.find(p => p.id === gkA);
let gkPlayerB = CACHE.players.find(p => p.id === gkB);

if (gkPlayerA) preparePlayerForMatch(gkPlayerA);
if (gkPlayerB) preparePlayerForMatch(gkPlayerB);

    // BONUSLU stats ile hazırla
    let players = selectedPlayers
        .map(id => CACHE.players.find(p => p.id === id))
        .filter(p => p && p.id !== gkA && p.id !== gkB)
        .map(p => preparePlayerForMatch(p))
        .map(p => getPlayerPositions(p));

    /* =====================================
       1) MAIN POZISYON GRUPLAMA
    ====================================== */
    let groups = {};
    POS_ORDER.forEach(pos => groups[pos] = []);

    players.forEach(p => {
        if (POS_ORDER.includes(p.main))
            groups[p.main].push(p);
    });

    POS_ORDER.forEach(pos => groups[pos].sort((a, b) => b.ovr - a.ovr));

    let posMap = {};
    let used = new Set();

    /* =====================================
       2) MAIN SLOT DOLDUR
    ====================================== */
    POS_ORDER.forEach(pos => {
        const list = groups[pos];

        if (list.length >= 2) {
            posMap[pos] = list[0].id;
            posMap[pos + "2"] = list[1].id;

            teamA.push(list[0].id);
            teamB.push(list[1].id);

            used.add(list[0].id);
            used.add(list[1].id);
        }
        else if (list.length === 1) {
            posMap[pos] = list[0].id;
            posMap[pos + "2"] = null;

            teamA.push(list[0].id);
            used.add(list[0].id);
        }
        else {
            posMap[pos] = null;
            posMap[pos + "2"] = null;
        }
    });

    /* =====================================
       3) SUB HAVUZU
    ====================================== */
    let subPlayers = players.filter(p => !used.has(p.id));
    subPlayers.sort((a, b) => b.ovr - a.ovr);

    /* =====================================
       4) SUB → BOŞ SLOT DOLDUR
    ====================================== */
    subPlayers.forEach(p => {
        if (!p.sub) return;

        let A_slot = posMap[p.sub];
        let B_slot = posMap[p.sub + "2"];

        if (!A_slot) {
            posMap[p.sub] = p.id;
            teamA.push(p.id);
            used.add(p.id);
            return;
        }

        if (!B_slot) {
            posMap[p.sub + "2"] = p.id;
            teamB.push(p.id);
            used.add(p.id);
            return;
        }
    });

    /* =====================================
       5) KALANLARI BONUS OVR’A GÖRE DOLDUR
    ====================================== */
    let leftovers = players.filter(p => !used.has(p.id));
    leftovers.sort((a, b) => b.ovr - a.ovr);

    POS_ORDER.forEach(pos => {
        if (!posMap[pos] && leftovers.length > 0) {
            let p = leftovers.shift();
            posMap[pos] = p.id;
            teamA.push(p.id);
            used.add(p.id);
        }

        if (!posMap[pos + "2"] && leftovers.length > 0) {
            let p = leftovers.shift();
            posMap[pos + "2"] = p.id;
            teamB.push(p.id);
            used.add(p.id);
        }
    });

    /* =====================================
       6) GK EKLE
    ====================================== */
    posMap["GK"] = gkA;
    posMap["GK2"] = gkB;

    /* =====================================
       7) BONUSLU OVR DENGELEME
    ====================================== */
    let balanced = balanceTeams(teamA, teamB, posMap);

    return {
        teamA: balanced.teamA,
        teamB: balanced.teamB,
        posMap: balanced.posMap
    };
}








function getPositionCandidates(ids, pos) {
    return ids
        .map(id => CACHE.players.find(x => x.id === id))
        .filter(p => p)
        .map(p => {
            let main = POS_MAP_REVERSE[p.mainPos];
            let sub  = POS_MAP_REVERSE[p.subPos];

            let match = (main === pos || sub === pos);

            const score = (
                (p.stats?.sut || 0) +
                (p.stats?.pas || 0) +
                (p.stats?.kondisyon || 0) +
                (p.stats?.hiz || 0) +
                (p.stats?.fizik || 0) +
				(p.stats?.oyunGorusu || 0) +
                (p.stats?.defans || 0)
            ) / 7;

            return { ...p, match, score };
        })
        .filter(p => p.match)
        .sort((a,b) => b.score - a.score);
}
function avgScore(s) {
    if (!s) return 0;
    return (
        (s.sut||0) + (s.pas||0) + (s.kondisyon||0) +
        (s.hiz||0) + (s.fizik||0) + (s.oyunGorusu||0) + (s.defans||0)
    ) / 7;
}


function fillMissing(pool, outfield, used) {
    if (pool.length >= 2) return pool;

    const remaining = outfield
        .map(id => CACHE.players.find(x => x.id === id))
        .filter(p => p && !used.has(p.id))
        .sort((a,b) => {
            const sa = avgScore(a.stats);
            const sb = avgScore(b.stats);
            return sb - sa;
        });

    while (pool.length < 2 && remaining.length > 0) {
        pool.push(remaining.shift());
    }
    return pool;
}



function clean(obj) {
    if (Array.isArray(obj)) {
        return obj.filter(v => v !== undefined);
    }
    if (typeof obj === "object" && obj !== null) {
        let out = {};
        for (let k in obj) {
            if (obj[k] !== undefined) out[k] = obj[k];
        }
        return out;
    }
    return obj;
}
function selectGKA(playerId, playerName) {
    const el = document.querySelector("#gkASelect");
    el.dataset.value = playerId;
    el.querySelector(".custom-display").innerText = playerName;
}

function selectGKB(playerId, playerName) {
    const el = document.querySelector("#gkBSelect");
    el.dataset.value = playerId;
    el.querySelector(".custom-display").innerText = playerName;
}

document.getElementById("buildBtn").onclick = async () => {

    if (selectedPlayers.length !== 16)
        return alert("16 oyuncu seçmelisin!");

    const gkA = document.querySelector("#gkASelect").dataset.value;
    const gkB = document.querySelector("#gkBSelect").dataset.value;

    if (!gkA || !gkB)
        return alert("Kalecileri seç!");

    const result = buildBalancedTeams(selectedPlayers, gkA, gkB);

    // 🔥 TAKIM TOPLAM OVR'LARINI YAZDIR
    printTeamOVRs(result.teamA, result.teamB);

    posMap = result.posMap;
    window.lastResult = result;

    const dataToSave = {
        teamA: clean(result.teamA),
        teamB: clean(result.teamB),
        posMap: clean(result.posMap),
        createdAt: new Date().toISOString()
    };

    await db.collection("haftaninKadro").doc("latest").set(dataToSave);

    alert("Kadro oluşturuldu!");
};


function loadGKSelectors() {
    const gkAOptions = document.querySelector("#gkASelect .custom-options");
    const gkBOptions = document.querySelector("#gkBSelect .custom-options");

    gkAOptions.innerHTML = "";
    gkBOptions.innerHTML = "";

    CACHE.players.forEach(p => {
        // A takımı için kaleci seçeneği
        gkAOptions.innerHTML += `
            <div class="option" onclick="selectGKA('${p.id}', '${p.name}')">
                ${p.name}
            </div>
        `;

        // B takımı için kaleci seçeneği
        gkBOptions.innerHTML += `
            <div class="option" onclick="selectGKB('${p.id}', '${p.name}')">
                ${p.name}
            </div>
        `;
    });
}



function posTranslate(code) {
    return {
        "GK": "Kaleci",
        "LB": "Sol Bek",
        "CB": "Stoper",
        "RB": "Sağ Bek",
        "LW": "Sol Kanat",
        "RW": "Sağ Kanat",
        "CM": "Merkez Orta",
        "ST": "Santrafor"
    }[code] || "-";
}



async function loadHaftaninKadro() {
    const snap = await db.collection("haftaninKadro").doc("latest").get();
    if (!snap.exists) return;

    const data = snap.data();
    const posMap = data.posMap || {};

    const teamABox = document.getElementById("haftaTeamA");
    const teamBBox = document.getElementById("haftaTeamB");

    teamABox.innerHTML = "";
    teamBBox.innerHTML = "";

    const posList = ["GK","CB","LB","RB","CM","LW","RW","ST"];

    // OVR Hesaplayıcı
    const getOVR = (p) => {
    return p?.matchOVR ?? getOVR_withBonus(p);
};

    // Renk sınıfı seçimi
    const getOvrClass = (ovr) => {
        if (ovr >= 85) return "ovr-gold";
        if (ovr >= 75) return "ovr-silver";
        return "ovr-bronze";
    };

    posList.forEach(pos => {
        const key = pos;

        const A_id = posMap[key] || null;
        const B_id = posMap[key + "2"] || null;

        const A_player = CACHE.players.find(p => p.id === A_id);
        const B_player = CACHE.players.find(p => p.id === B_id);
if (A_player) preparePlayerForMatch(A_player);
if (B_player) preparePlayerForMatch(B_player);

        const posName = posTranslate(key);

        const ovrA = getOVR(A_player);
        const ovrB = getOVR(B_player);

        const classA = getOvrClass(ovrA);
        const classB = getOvrClass(ovrB);

        // A TAKIMI
        teamABox.innerHTML += `
            <div class="hkPlayer">
                <img class="hkFormImg" src="${FORMA_A}">
                <div class="playerOVR ${classA}">${A_player ? ovrA : "-"}</div>

                <span>${A_player ? A_player.name : "-"}</span>
                <span class="playerPos">${A_player ? posName : "-"}</span>
            </div>
        `;

        // B TAKIMI
        teamBBox.innerHTML += `
            <div class="hkPlayer">
                <img class="hkFormImg" src="${FORMA_B}">
                <div class="playerOVR ${classB}">${B_player ? ovrB : "-"}</div>

                <span>${B_player ? B_player.name : "-"}</span>
                <span class="playerPos">${B_player ? posName : "-"}</span>
            </div>
        `;
    });
// === SAHA YERLEŞTİRME ===
const field = document.getElementById("playersOnField");
field.innerHTML = "";

// A TAKIMI POZİSYONLARI (SOL TARAF)
const coordsA = {
    "GK":  { x: 8, y: 52 },
    "CB":{ x: 20, y: 52 },
    "LB":  { x: 25, y: 20 },
    "RB":  { x: 25, y: 80 },
    "CM":{ x: 45, y: 52 },
    "LW":  { x: 60, y: 15 },
    "RW":  { x: 60, y: 85 },
    "ST":  { x: 72, y: 52 }
};

// B TAKIMI POZİSYONLARI (SAĞ TARAF)
const coordsB = {
    "GK":  { x: 92, y: 52 },
    "CB":{ x: 80, y: 52 },
    "LB":  { x: 75, y: 80 },
    "RB":  { x: 75, y: 20 },
    "CM":{ x: 55, y: 52 },
    "LW":  { x: 40, y: 85 },
    "RW":  { x: 40, y: 15 },
    "ST":  { x: 28, y: 52 }
};

function drawOnField(player, pos, team) {
    if (!player) return;

    const posKey = pos;
    const c = team === "A" ? coordsA[posKey] : coordsB[posKey];
    if (!c) return;

   field.innerHTML += `
    <div class="playerMark" style="left:${c.x}%; top:${c.y}%;">
        <div class="formWrapper">
            <img src="${team === "A" ? FORMA_A : FORMA_B}" class="formImg">
            <span class="formNumber">${player.matchOVR ?? getOVR_withBonus(player)}</span>

        </div>
        <div class="playerName">${player.name}</div>
    </div>
`;

}

// ÇİME OYUNCULARI ÇİZ
posList.forEach(pos => {
   const key = pos;

    const A_player = CACHE.players.find(p => p.id === posMap[key]);
    const B_player = CACHE.players.find(p => p.id === posMap[key + "2"]);

    drawOnField(A_player, key, "A");
    drawOnField(B_player, key, "B");
});

    console.log("POS MAP:", posMap);
    console.log("TEAM A:", data.teamA);
    console.log("TEAM B:", data.teamB);
}


function debugTeamOVR(teamA, teamB) {
    const getOVR = (p) => {
        if (!p || !p.stats) return 0;
        const s = p.stats;
        return Math.round(
            ((s.sut||0)+(s.pas||0)+(s.kondisyon||0)+(s.hiz||0)+(s.fizik||0)+(s.oyunGorusu||0)+(s.defans||0)) / 7
        );
    };

    let sumA = 0;
    let sumB = 0;

    console.log("====== TAKIM OVR DEBUG ======");

    console.log("---- A Takımı ----");
    teamA.forEach(id => {
        const p = CACHE.players.find(x => x.id === id);
        if (!p) return;
        const ovr = getOVR(p);
        sumA += ovr;
        console.log(p.name, "→", ovr);
    });

    console.log("TOPLAM A:", sumA);

    console.log("---- B Takımı ----");
    teamB.forEach(id => {
        const p = CACHE.players.find(x => x.id === id);
        if (!p) return;
        const ovr = getOVR(p);
        sumB += ovr;
        console.log(p.name, "→", ovr);
    });

    console.log("TOPLAM B:", sumB);

    console.log("FARK:", Math.abs(sumA - sumB));
}



function mapPosition(pos) {
    if (!pos) return "";
    pos = pos.toLowerCase().trim();

    if (pos === "santrafor") return "ST";
    if (pos === "merkez orta") return "CM";
    if (pos === "sol kanat") return "LW";
    if (pos === "sağ kanat") return "RW";
    if (pos === "stoper") return "CB";
    if (pos === "sol bek") return "LB";
    if (pos === "sağ bek") return "RB";
    if (pos === "kaleci") return "GK";

    console.log("⚠ mapPosition: Eşleşmeyen pozisyon:", pos);
    return pos.toUpperCase();
}
function applyMatchBonus(player, stats) {
    const pos = mapPosition(player.mainPos);
    let s = { ...stats }; // Tabandan kopya

    // Yüzde bonus hesaplayan fonksiyon
    const boost = (v, percent) => Math.round(v * (1 + percent / 100));

    if (pos === "ST") {
        s.sut = boost(s.sut, 25);        // %25
        s.hiz = boost(s.hiz, 15);        // %15
        s.kondisyon = boost(s.kondisyon, 15);  // %15
    }
    else if (pos === "LW" || pos === "RW") {
        s.hiz = boost(s.hiz, 25);        // %25
        s.kondisyon = boost(s.kondisyon, 15);  // %15
        s.sut = boost(s.sut, 15);        // %15
    }
    else if (pos === "CM") {
        s.pas = boost(s.pas, 25);        // %25
        s.oyunGorusu = boost(s.oyunGorusu, 20); // %20
        s.fizik = boost(s.fizik, 10);    // %10
    }
    else if (pos === "LB" || pos === "RB") {
        s.defans = boost(s.defans, 15);  // %25
        s.fizik = boost(s.fizik, 20);    // %20
        s.hiz = boost(s.hiz, 20);        // %10
    }
	else if (pos === "CB") {
        s.defans = boost(s.defans, 25);  // %25
        s.fizik = boost(s.fizik, 20);    // %20
        s.hiz = boost(s.hiz, 10);        // %10
    }

    return s;
}



function getOVR_withBonus(player) {
    const base = player.stats || {};
    const applied = applyMatchBonus(player, base);

    return Math.round(
        (
            (applied.sut||0) +
            (applied.pas||0) +
            (applied.kondisyon||0) +
            (applied.hiz||0) +
            (applied.fizik||0) +
            (applied.oyunGorusu||0) +
            (applied.defans||0)
        ) / 7
    );
}

function printTeamOVRs(teamA, teamB) {
    const getPlayer = id => CACHE.players.find(p => p.id === id);

    console.log("================================");
    console.log("🔥 A TAKIMI OYUNCU OVR LİSTESİ");
    console.log("================================");

    teamA.forEach(id => {
        const p = getPlayer(id);
        if (p) {
            console.log(`${p.name} → ${p.matchOVR}`);
        }
    });

    console.log("\n================================");
    console.log("🔥 B TAKIMI OYUNCU OVR LİSTESİ");
    console.log("================================");

    teamB.forEach(id => {
        const p = getPlayer(id);
        if (p) {
            console.log(`${p.name} → ${p.matchOVR}`);
        }
    });


    // --- TOPLAM OVR ---
    const sumOVR = team => 
        team.reduce((total, playerId) => {
            const p = getPlayer(playerId);
            return total + (p?.matchOVR || 0);
        }, 0);

    const totalA = sumOVR(teamA);
    const totalB = sumOVR(teamB);

    console.log("\n================================");
    console.log("🔥 TAKIM OVR TOPLAMLARI");
    console.log("================================");

    console.log("A TAKIMI TOPLAM OVR →", totalA);
    console.log("B TAKIMI TOPLAM OVR →", totalB);

    console.log(`⚽ FARK: ${Math.abs(totalA - totalB)}`);
}

