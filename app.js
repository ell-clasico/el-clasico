/* ==========================================================
   V17 PRO — GLOBAL OPTIMIZED (TEK DOSYA)
========================================================== */

const upload = Upload({
    apiKey: "public_G22nj4G4oJqYwoLB52gv3yHBP462"
});

const DEFAULT_PHOTO = "./img/profil.png";
let currentUser = null;
const db = firebase.firestore();
const FORMA_A = "./img/kırmızı.png";
const FORMA_B = "./img/mavi.png"; 
let selects = {};
let multiSelects = {};
let currentKadroPosMap = {};   // Haftanın kadrosu pozisyon haritası..
let swapSelection = null;      // Adminin seçtiği ilk oyuncu
window.lastWeeklyData = null;  // haftaninKadro/latest içeriği
// ==========================================================
// GLOBAL CACHE — TÜM VERİLERİ 1 KERE ÇEKER.
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
function renderOrderText(order) {
    if (!order) return "";

    if (order <= 16) {
        return `Mevcut sıran ${order} / 16`;
    }

    return `Sıran ${order} — Yedek oyuncusun`;
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

    if (id === "profilim") loadProfil();
    if (id === "admin") loadLoginLogs();
    if (id === "kazananYonetim") loadWinnerPlayerGrid();

    // ⭐ KADRO SAYFASI
    if (id === "kadro") {
        loadKadroPlayerGrid();

        if (window.clearKadroUIPending) {
            clearKadroUI();
            window.clearKadroUIPending = false;
        }
    }

    // ⭐ HAFTANIN KADROSU SAYFASI
    if (id === "haftaninKadro") {
	
        (async () => {
            await loadHaftaninKadro();

            // ⭐ SAYFA AÇILINCA OTOMATİK SIRAYI GÖSTER
            if (currentUser && currentUser !== "ADMIN") {
                const status = document.getElementById("comingStatus");

                const attSnap = await db.collection("attendance")
                    .orderBy("timestamp", "asc")
                    .get();

                let index = 1;
                let myOrder = null;

                attSnap.forEach(a => {
                    const data = a.data();
                    if (data.coming) {
                        if (data.user === currentUser) myOrder = index;
                        index++;
                    }
                });

               status.innerText = renderOrderText(myOrder);
status.style.color = (myOrder > 16 ? "#ff4d4d" : "#ffffff");

            }
        })();
 if (!window._comingListListenerAdded) {

            window._comingListListenerAdded = true;

            db.collection("attendance")
                .orderBy("timestamp", "asc")
                .onSnapshot((snap) => {

                    const listDiv = document.getElementById("comingList");
                    if (!listDiv) return;

                    let html = "";
                    let index = 1;

                    snap.forEach(doc => {
                        const data = doc.data();
                        if (data.coming) {
                            html += `${index}. ${data.user}<br>`;
                            index++;
                        }
                    });

                    setTimeout(() => {
    const listDiv = document.getElementById("comingList");
    if (listDiv) listDiv.innerHTML = html;
}, 20);

                });
        }
        // ⭐ KAYDET BUTONU
        const saveBtn = document.getElementById("comingSaveBtn");

        if (saveBtn && !saveBtn._eventAdded) {
            saveBtn._eventAdded = true;

            saveBtn.addEventListener("click", async () => {
                const check = document.getElementById("comingCheck");
                const status = document.getElementById("comingStatus");

                if (currentUser && currentUser !== "ADMIN") {

                    // 🟢 GELİYORUM
                    if (check.checked) {
                        await db.collection("attendance").doc(currentUser).set({
                            user: currentUser,
                            coming: true,
                            timestamp: new Date().toISOString()
                        });

                        // ⭐ SIRAYI HESAPLA
                        const attSnap = await db.collection("attendance")
                            .orderBy("timestamp", "asc")
                            .get();

                        let index = 1;
                        let myOrder = null;

                        attSnap.forEach(a => {
                            const data = a.data();
                            if (data.coming) {
                                if (data.user === currentUser) myOrder = index;
                                index++;
                            }
                        });

                       status.innerText = renderOrderText(myOrder);
						status.style.color = (myOrder > 16 ? "#ff4d4d" : "#ffffff");

                    }

                    // 🔴 GELMİYORUM
                    else {
                        await db.collection("attendance").doc(currentUser).delete();
                        status.innerText = "";
                    }
                }

                notify("Kaydedildi!");
            });
        }
    }

    // ⭐ Son açılan sayfayı kaydet
    if (id !== "login") localStorage.setItem("hsPage", id);
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
	await db.collection("loginLogs").add({
        user: name,
        timestamp: new Date().toISOString()
    });
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

        // ⭐ PROFİLDEKİYLE AYNI BONUSLU OVR
        const ovr = getOVR_withBonus(p);

        box.innerHTML += `
    <div class="card" style="position: relative;">

        <div class="ovr-badge">${ovr}</div>   <!-- ⭐ SOL ÜSTTE BONUSLU OVR -->

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
let winnerSelected = [];

function loadWinnerPlayerGrid() {
    const grid = document.getElementById("winnerPlayerGrid");
    if (!grid) return; // güvenlik önlemi

    grid.innerHTML = "";

    CACHE.players.forEach(p => {
        const div = document.createElement("div");
        div.className = "player-item";
        div.innerText = p.name;
        div.dataset.id = p.id;

        div.onclick = () => {
            if (div.classList.contains("selected")) {
                div.classList.remove("selected");
                winnerSelected = winnerSelected.filter(x => x !== p.name);
            } else {
                div.classList.add("selected");
                winnerSelected.push(p.name);
            }
        };

        grid.appendChild(div);
    });
}

// ==========================================================
// KAZANAN KAYDET
// ==========================================================
async function kazananKaydet() {

    // 🔥 Artık grid üzerinden seçilen oyuncuları kullanıyoruz
    let arr = winnerSelected;  

    if (!arr.length) return alert("Oyuncu seç!");

    await db.collection("winners").add({
        players: arr,
        date: new Date().toISOString()
    });

    notify("Kaydedildi");

    // 🔥 Seçimleri ekrandan temizle
    winnerSelected = [];
    document.querySelectorAll("#winnerPlayerGrid .player-item")
        .forEach(el => el.classList.remove("selected"));

    // Yeniden yükle
    await loadAll();
    loadWinnerPlayerGrid();
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


async function getMyOrder(user) {
    const attSnap = await db.collection("attendance")
        .orderBy("timestamp", "asc")
        .get();

    let index = 1;

    for (const a of attSnap.docs) {
        const data = a.data();
        if (data.coming) {
            if (data.user === user) return index;
            index++;
        }
    }
    return null;
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
    const attSnap = await db.collection("attendance")
        .orderBy("timestamp", "asc")
        .get();

    // Katılım listesi → sıraya göre
    let orderMap = {};
    let index = 1;

    attSnap.forEach(a => {
        const data = a.data();
        if (data.coming) {
            orderMap[data.user] = index;
            index++;
        }
    });

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
	div.style.position = "relative";
        let sira = orderMap[p.name] || null;

        // ⭐ Sadece küçük sıra etiketi ekleniyor — tasarım bozulmuyor
        if (sira !== null) {
            const badge = document.createElement("div");
            badge.innerText = sira;
            badge.style.position = "absolute";
            badge.style.top = "3px";
            badge.style.left = "6px";
            badge.style.fontSize = "11px";
            badge.style.fontWeight = "700";
            badge.style.padding = "2px 5px";
            badge.style.borderRadius = "6px";

            // İlk 16 kişi yeşil (buton yeşil değil — badge yeşil)
            if (sira <= 16) {
                badge.style.background = "rgba(34,197,94,0.7)";
                badge.style.color = "#fff";
            } 
            // 17 ve sonrası kırmızı
            else {
                badge.style.background = "rgba(239,68,68,0.8)";
                badge.style.color = "#fff";
            }

            div.appendChild(badge);
        }

        // ⭐ Katılım yapanlar otomatik seçili
        if (sira !== null && sira <= 16) {
            div.classList.add("selected");
            selectedPlayers.push(id);
        }

        // ⭐ SENİN MEVCUT TIKLAMA SİSTEMİN — HİÇ DEĞİŞMEDİ
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

    updateGKDropdowns();
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

    const map = {
        "kaleci": "GK",
        "sol bek": "LB", "solbek": "LB",
        "sağ bek": "RB", "sag bek": "RB", "sağbek": "RB", "sagbek": "RB",
        "stoper": "CB", "defans": "CB",
        "sol kanat": "LW", "solkanat": "LW",
        "sağ kanat": "RW", "sag kanat": "RW", "sağkanat": "RW", "sagkanat": "RW",
        "merkez orta": "CM", "orta saha": "CM", "ortasaha": "CM",
        "santrafor": "ST", "forvet": "ST"
    };

    return map[posName] || posName.toUpperCase();
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
        main: normalizePos(p.mainPos),
        sub: normalizePos(p.subPos),
        ovr: p.matchOVR
    };
}





/* ==========================================================
   TAKIM DENGELEYİCİ (OVR BALANCER)
========================================================== */
function balanceTeams(teamA, teamB, posMap) {

    const getPlayer = id => CACHE.players.find(p => p.id === id);
    const getOVR = p => p?.matchOVR ?? 0;

    const GROUP_LIMIT = {
    attack: 15,
    defense: 15,
    midfield: 10
};

    function computeGroups() {
        const gp = pos => getOVR(getPlayer(posMap[pos])) || 0;

        return {
            atkA: gp("ST") + gp("RW") + gp("LW"),
            atkB: gp("ST2") + gp("RW2") + gp("LW2"),

            defA: gp("LB") + gp("CB") + gp("RB"),
            defB: gp("LB2") + gp("CB2") + gp("RB2"),

            midA: gp("CM"),
            midB: gp("CM2")
        };
    }

    function groupsOK(G) {
        let atk = Math.abs(G.atkA - G.atkB);
        let def = Math.abs(G.defA - G.defB);
        let mid = Math.abs(G.midA - G.midB);

        if (atk > GROUP_LIMIT.attack) return false;
        if (def > GROUP_LIMIT.defense) return false;
        if (mid > GROUP_LIMIT.midfield) return false;

        if (atk === 15 && def !== 15) return false;
        if (def === 15 && atk !== 15) return false;

        return true;
    }


    function tryGroupSwap() {

    const G = computeGroups();

    let diffs = {
        attack: Math.abs(G.atkA - G.atkB),
        defense: Math.abs(G.defA - G.defB),
        midfield: Math.abs(G.midA - G.midB)
    };

    // En büyük sorunu hedef al
    let target = Object.keys(diffs).sort((a,b)=> diffs[b]-diffs[a])[0];

    if (diffs[target] <= GROUP_LIMIT[target]) return false;

    const groupPositions = {
        attack: ["ST", "LW", "RW"],
        defense: ["LB", "CB", "RB"],
        midfield: ["CM"]
    }[target];

    let bestGain = 0;
    let best = null;

    for (let posA of groupPositions) {
        for (let posB of groupPositions) {

            let A = getPlayer(posMap[posA]);
            let B = getPlayer(posMap[posB+"2"]);
            if (!A || !B) continue;

            let before =
                target === "attack"  ? Math.abs(G.atkA - G.atkB) :
                target === "defense" ? Math.abs(G.defA - G.defB) :
                Math.abs(G.midA - G.midB);

            let afterA =
                target === "attack"  ? G.atkA - getOVR(A) + getOVR(B) :
                target === "defense" ? G.defA - getOVR(A) + getOVR(B) :
                G.midA - getOVR(A) + getOVR(B);

            let afterB =
                target === "attack"  ? G.atkB - getOVR(B) + getOVR(A) :
                target === "defense" ? G.defB - getOVR(B) + getOVR(A) :
                G.midB - getOVR(B) + getOVR(A);

            let after = Math.abs(afterA - afterB);

            let gain = before - after;
            if (gain > bestGain) {
                bestGain = gain;
                best = { posA, posB };
            }
        }
    }

    if (!best) return false;

    // SWAP OPERASYONU
    let aId = posMap[best.posA];
    let bId = posMap[best.posB + "2"];

    posMap[best.posA] = bId;
    posMap[best.posB + "2"] = aId;

    let ai = teamA.indexOf(aId);
    let bi = teamB.indexOf(bId);

    if (ai > -1) teamA[ai] = bId;
    if (bi > -1) teamB[bi] = aId;

    return true;
}


    // Ana dengeleme döngüsü
    for (let i = 0; i < 60; i++) {
        let G = computeGroups();
        if (groupsOK(G)) break;
        if (!tryGroupSwap()) break;
    }
(function debugGroups(){
    const G = computeGroups();

    console.log("========== BÖLGESEL FARKLAR ==========");
    console.log(`HÜCUM  A: ${G.atkA} | B: ${G.atkB} | FARK: ${Math.abs(G.atkA - G.atkB)}`);
    console.log(`ORTA   A: ${G.midA} | B: ${G.midB} | FARK: ${Math.abs(G.midA - G.midB)}`);
    console.log(`DEFANS A: ${G.defA} | B: ${G.defB} | FARK: ${Math.abs(G.defA - G.defB)}`);
    console.log("=======================================");
})();
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

    const POS_ORDER = ["ST", "RW", "LW", "CM", "LB", "CB", "RB"];

    let teamA = [gkA];
    let teamB = [gkB];

    // GK hazırlanıyor
    preparePlayerForMatch(CACHE.players.find(p => p.id === gkA));
    preparePlayerForMatch(CACHE.players.find(p => p.id === gkB));

    let players = selectedPlayers
        .filter(id => id !== gkA && id !== gkB)
        .map(id => preparePlayerForMatch(CACHE.players.find(p => p.id === id)))
        .map(p => getPlayerPositions(p));

    // --- POZİSYON GRUPLAMA ---
    let groups = {};
    POS_ORDER.forEach(pos => groups[pos] = []);

    players.forEach(p => {
        if (POS_ORDER.includes(p.main)) groups[p.main].push(p);
        else if (POS_ORDER.includes(p.sub)) groups[p.sub].push(p);
    });

    POS_ORDER.forEach(pos => groups[pos].sort((a, b) => b.ovr - a.ovr));

    let posMap = {};
    let used = new Set();

    // Ana oyuncuların yerleştirilmesi
    POS_ORDER.forEach(pos => {
        if (groups[pos].length >= 2) {
            posMap[pos] = groups[pos][0].id;
            posMap[pos + "2"] = groups[pos][1].id;

            teamA.push(groups[pos][0].id);
            teamB.push(groups[pos][1].id);

            used.add(groups[pos][0].id);
            used.add(groups[pos][1].id);
        }
    });

    // --- Eksik pozisyonları SUB / yüksek OVR ile doldur ---
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

    // Kaleciler ekleniyor
    posMap["GK"] = gkA;
    posMap["GK2"] = gkB;

    // 🔥 En son bölgesel balance
    let balanced = balanceTeams(teamA, teamB, posMap);

    return balanced;
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

    // ⭐ 1) Kadroyu Firestore'a kaydediyoruz (senin sistemin)
    await db.collection("haftaninKadro").doc("latest").set(dataToSave);

    // ⭐ 2) — EKLEDİĞİM KISIM —
    //    Kullanıcıların "geliyorum" işaretlerini tamamen temizle
    await db.collection("attendance").get().then(q =>
        q.forEach(d => d.ref.delete())
    );

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


// === TEK FONKSİYON: HAFTANIN KADROSU ===
async function loadHaftaninKadro() {

    console.log("📌 AÇILAN SAYFA: haftaninKadro");

    const userPanel  = document.getElementById("userAttendancePanel");
    const squadPanel = document.getElementById("weeklySquadPanel");

    if (userPanel) userPanel.style.display = "none";
    if (squadPanel) squadPanel.style.display = "none";

    const snap     = await db.collection("haftaninKadro").doc("latest").get();
    const noteSnap = await db.collection("weekNote").doc("latest").get();

    const noteText = noteSnap.exists ? noteSnap.data().text : "";
    const noteBox  = document.getElementById("weekNoteBox");

    if (noteBox) {
        if (noteText.trim() === "") {
            noteBox.style.display = "none";
        } else {
            noteBox.style.display = "block";
            noteBox.innerText = noteText;
        }
    }

    // ==================================================
    // ⭐ KADRO YOKSA → SADECE KULLANICI KATILIM PANELİ
    // ==================================================
    if (!snap.exists) {

        if (currentUser !== "ADMIN" && userPanel) {
            userPanel.style.display = "block";
            setTimeout(() => loadUserAttendanceState(), 50);
        }

        const teamABox = document.getElementById("haftaTeamA");
        const teamBBox = document.getElementById("haftaTeamB");
        const field    = document.getElementById("playersOnField");

        if (teamABox) teamABox.innerHTML = "";
        if (teamBBox) teamBBox.innerHTML = "";
        if (field)    field.innerHTML    = "";

        return;
    }

    // ==================================================
    // ⭐ KADRO VAR → SADECE SQUAD PANELİ
    // ==================================================
    if (userPanel)  userPanel.style.display  = "none";
    if (squadPanel) squadPanel.style.display = "block";

    // VERİLERİ AL
    const data   = snap.data();
    const posMap = data.posMap || {};

    // SWAP İÇİN GLOBAL SAKLA
    currentKadroPosMap = { ...posMap };
    currentWeeklyData  = data;

    const teamABox = document.getElementById("haftaTeamA");
    const teamBBox = document.getElementById("haftaTeamB");
    const field    = document.getElementById("playersOnField");

    teamABox.innerHTML = "";
    teamBBox.innerHTML = "";
    field.innerHTML    = "";

    const posList = ["GK","CB","LB","RB","CM","LW","RW","ST"];

    const getOVR      = (p) => p?.matchOVR ?? getOVR_withBonus(p);
    const getOvrClass = (o) => o >= 85 ? "ovr-gold" : o >= 75 ? "ovr-silver" : "ovr-bronze";

    // ==================================================
    // ⭐ TAKIM LİSTELERİ
    // ==================================================
    posList.forEach(pos => {

        const A_id = posMap[pos]     || null;
        const B_id = posMap[pos+"2"] || null;

        const A_player = CACHE.players.find(p => p.id === A_id);
        const B_player = CACHE.players.find(p => p.id === B_id);

        if (A_player) preparePlayerForMatch(A_player);
        if (B_player) preparePlayerForMatch(B_player);

        const posName = posTranslate(pos);

        const ovrA   = getOVR(A_player);
        const ovrB   = getOVR(B_player);
        const classA = getOvrClass(ovrA);
        const classB = getOvrClass(ovrB);

        // --- A TAKIMI ---
        teamABox.innerHTML += `
            <div class="hkPlayer ${currentUser === 'ADMIN' ? 'swap-clickable' : ''}"
                 data-team="A" data-pos="${pos}">
                <img class="hkFormImg" src="${FORMA_A}">
                <div class="playerOVR ${classA}">${A_player ? ovrA : "-"}</div>
                <span>${A_player ? A_player.name : "-"}</span>
                <span class="playerPos">${A_player ? posName : "-"}</span>
            </div>
        `;

        // --- B TAKIMI ---
        teamBBox.innerHTML += `
            <div class="hkPlayer ${currentUser === 'ADMIN' ? 'swap-clickable' : ''}"
                 data-team="B" data-pos="${pos}">
                <img class="hkFormImg" src="${FORMA_B}">
                <div class="playerOVR ${classB}">${B_player ? ovrB : "-"}</div>
                <span>${B_player ? B_player.name : "-"}</span>
                <span class="playerPos">${B_player ? posName : "-"}</span>
            </div>
        `;
    });

    // ==================================================
    // ⭐ SAHA YERLEŞTİR
    // ==================================================
    const coordsA = {
        "GK":{x:8,y:44},"CB":{x:20,y:44},"LB":{x:25,y:17},"RB":{x:25,y:69},
        "CM":{x:45,y:44},"LW":{x:60,y:12},"RW":{x:60,y:74},"ST":{x:72,y:44}
    };

    const coordsB = {
        "GK":{x:92,y:44},"CB":{x:80,y:44},"LB":{x:75,y:69},"RB":{x:75,y:17},
        "CM":{x:55,y:44},"LW":{x:40,y:74},"RW":{x:40,y:12},"ST":{x:28,y:44}
    };

    function drawOnField(player, pos, team) {
        if (!player) return;

        const posXY = team === "A" ? coordsA[pos] : coordsB[pos];
        if (!posXY) return;

        field.innerHTML += `
            <div class="playerMark" style="left:${posXY.x}%; top:${posXY.y}%;">
                <div class="formWrapper">
                    <img class="formImg" src="${team === "A" ? FORMA_A : FORMA_B}">
                    <span class="formNumber">${player.matchOVR ?? getOVR_withBonus(player)}</span>
                </div>
                <div class="playerName">${player.name}</div>
            </div>
        `;
    }

    posList.forEach(pos => {
        drawOnField(CACHE.players.find(p => p.id === posMap[pos]),     pos, "A");
        drawOnField(CACHE.players.find(p => p.id === posMap[pos+"2"]), pos, "B");
    });

    // ==================================================
    // ⭐ ADMIN İSE: OYUNCU DEĞİŞTİRME AKTİF
    // ==================================================
    if (currentUser === "ADMIN") {
        document.querySelectorAll(".swap-clickable").forEach(el => {
            el.onclick = () => adminSwapClick(el, posList);
        });
    }

    console.log("✔ Haftanın kadrosu çizildi");
}


// === ADMIN SWAP FONKSİYONU ===
async function adminSwapClick(el, posList) {
    const team = el.dataset.team;
    const pos  = el.dataset.pos;

    const key       = team === "A" ? pos : pos + "2";
    const clickedId = currentKadroPosMap[key];

    if (!clickedId) return;

    // 1. Seçim
    if (!swapSelection) {
        swapSelection = { team, pos, key };
        el.classList.add("swap-selected");
        return;
    }

    // Aynı elemana tıklarsa → iptal
    if (swapSelection.team === team && swapSelection.pos === pos) {
        document.querySelectorAll(".swap-selected")
            .forEach(x => x.classList.remove("swap-selected"));
        swapSelection = null;
        return;
    }

    // 2. Seçim → SWAP
    const key1 = swapSelection.key;
    const key2 = key;

    const id1 = currentKadroPosMap[key1];
    const id2 = currentKadroPosMap[key2];

    currentKadroPosMap[key1] = id2;
    currentKadroPosMap[key2] = id1;

    // Seçim highlightlarını temizle
    document.querySelectorAll(".swap-selected")
        .forEach(x => x.classList.remove("swap-selected"));
    swapSelection = null;

    // Firestore'a kaydet
    await db.collection("haftaninKadro").doc("latest").update({
        posMap: currentKadroPosMap
    });

    // Ekranı tekrar çiz
    await loadHaftaninKadro();
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

async function loadLoginLogs() {
    const table = document.getElementById("loginLogsTable");
    if (!table) return;

    table.innerHTML = "";

    const snap = await db.collection("loginLogs")
        .orderBy("timestamp", "desc")
        .get();

    snap.forEach(doc => {
        const data = doc.data();
        const t = new Date(data.timestamp);

        table.innerHTML += `
            <tr>
                <td>${data.user}</td>
                <td>${t.toLocaleDateString()}</td>
                <td>${t.toLocaleTimeString()}</td>
            </tr>
        `;
    });
}
async function saveAttendance() {
    if (!currentUser || currentUser === "ADMIN") return;

    let coming = document.getElementById("comingCheck").checked;

    await db.collection("attendance").doc(currentUser).set({
        user: currentUser,
        coming,
        timestamp: new Date().toISOString()
    });
await loadComingList();   // 🔥 Liste anında yenilenir
    notify("Katılım Kaydedildi");
}
async function loadUserAttendanceState() {
    if (!currentUser || currentUser === "ADMIN") return;

    const check = document.getElementById("comingCheck");
    const status = document.getElementById("comingStatus");

    const ref = await db.collection("attendance").doc(currentUser).get();

    if (ref.exists) {
        const coming = ref.data().coming;
        check.checked = coming;
    } else {
        check.checked = false;
        status.innerText = "";
    }
}
async function resetAllPoints() {

    // 1) Gol / Asist kayıtlarını sil
    await db.collection("ga").get().then(q =>
        q.forEach(d => d.ref.delete())
    );

    // 2) Kazanan listelerini sil
    await db.collection("winners").get().then(q =>
        q.forEach(d => d.ref.delete())
    );

    // 3) Puan geçmişini (ratings) sil — EN İYİ TABLOSU BUNU KULLANIYOR
    await db.collection("ratings").get().then(q =>
        q.forEach(d => d.ref.delete())
    );

    notify("Gol, Kazananlar ve En İyi Oyuncu verileri tamamen sıfırlandı!");

    // 4) Ekranı güncelle
    await loadAll();
}




async function resetWeek() {
    // 1) Firestore temizliği
    await db.collection("attendance").get().then(q =>
        q.forEach(d => d.ref.delete())
    );
	 const note = document.getElementById("weekNoteInput").value || "";
    await db.collection("weekNote").doc("latest").set({
        text: note,
        timestamp: new Date().toISOString()
    });
    await db.collection("haftaninKadro").doc("latest").delete();

    notify("Yeni hafta başlatıldı!");

    // 2) Kullanıcı ekranındaki tiki sıfırla
    const ch = document.getElementById("comingCheck");
    if (ch) ch.checked = false;

    // 3) Kadro düzenleme ekranını tamamen temizle
    clearKadroUI();

    // 4) Haftanın kadrosu ekranını sıfır moda döndür
    if (typeof loadHaftaninKadro === "function") {
        loadHaftaninKadro();
    }
}

function clearKadroUI() {
    // Oyuncu seçimlerini temizle
    selectedPlayers = [];

    // Grid üzerindeki seçili class'ları sil
    const items = document.querySelectorAll("#kadroPlayerGrid .player-item");
    if (items.length > 0) {
        items.forEach(div => div.classList.remove("selected"));
    }
}
document.getElementById("toggleComingListBtn").onclick = async () => {
    const box = document.getElementById("comingListBox");
    const btn = document.getElementById("toggleComingListBtn");

  

    // ⭐ Sonra paneli aç/kapa
    if (box.style.display === "none" || box.style.display === "") {
        box.style.display = "block";
        btn.innerText = "🔽 Listeyi Gizle";
    } else {
        box.style.display = "none";
        btn.innerText = "👥 Gelenleri Gör";
    }
};










