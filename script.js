// ==========================================
// AKUPETA // SCRIPT UTAMA, FILTER IKON & GITHUB API SYNC
// ==========================================

// 1. Inisialisasi Peta (Center Blitar)
let map = L.map('map', {
    zoomControl: false 
}).setView([-8.1018, 112.1648], 14);

// Pindahkan posisi kontrol zoom ke kiri atas / sesuai selera
L.control.zoom({ position: 'topleft' }).addTo(map);

// Menggunakan Tile Layer CartoDB Dark Matter
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// 2. Array global & Layer Group untuk registry marker & filter
let markersRegistry = [];
var markersLayer = L.layerGroup().addTo(map);

// Konfigurasi GitHub Repository
const GITHUB_USER = "BlackAnomali";
const GITHUB_REPO = "AkuPeta";
const GITHUB_FILE_PATH = "data.json";

// 3. Fungsi untuk Memuat Ikon Kustom Berdasarkan Kategori
function getCustomIcon(kategori) {
    let iconUrl = 'lainnya.svg';

    if (kategori === 'Kuliner') {
        iconUrl = 'kuliner.svg';
    } else if (kategori === 'Pedagang Keliling') {
        iconUrl = 'pak-ogah.svg';
    } else if (kategori === 'Jasa / Lainnya') {
        iconUrl = 'lainnya.svg';
    }

    return L.icon({
        iconUrl: iconUrl,
        iconSize: [32, 32],       
        iconAnchor: [16, 32],     
        popupAnchor: [0, -35]     
    });
}

// 4. Fungsi Memuat Data dari GitHub
async function loadDataFromGitHub() {
    try {
        let response = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}?t=` + new Date().getTime());
        if (!response.ok) throw new Error("Gagal memuat data dari GitHub");
        let dataList = await response.json();
        
        markersRegistry = [];
        markersLayer.clearLayers();

        dataList.forEach(item => {
            addMarkerToMap(item);
        });
    } catch (error) {
        console.error("Error memuat data:", error);
    }
}

// 5. Fungsi untuk Menambahkan Marker ke Peta
function addMarkerToMap(item) {
    let marker = L.marker([item.lat, item.lng], { 
        icon: getCustomIcon(item.kategori) 
    }).bindPopup(`
        <div style="font-family: 'Courier New', Courier, monospace;">
            <strong style="font-size: 1.1em; color: #fff;">${item.nama}</strong><br>
            <span style="color: #fca5a5; font-size: 0.9em;">Kategori: ${item.kategori}</span>
            <hr style="border:0; border-top:1px dashed #dc2626; margin:6px 0;">
            <div style="font-size: 0.85em; margin-bottom: 10px; color: #ccc;">${item.catatan || ''}</div>
            <button onclick="openModal('${item.nama.replace(/'/g, "\\'")}', '${item.kategori}', '${(item.catatan || '').replace(/'/g, "\\'")}')" 
                style="background: #dc2626; color: white; border: 1px solid #fff; padding: 6px 10px; cursor: pointer; font-size: 0.8em; font-weight: bold; width: 100%; border-radius: 0px; box-shadow: 2px 2px 0px rgba(255,255,255,0.3);">
                VIEW MORE &gt;&gt;
            </button>
        </div>
    `);

    markersRegistry.push({
        category: item.kategori,
        marker: marker
    });

    marker.addTo(markersLayer);
}

// Jalankan saat pertama kali web dibuka
loadDataFromGitHub();

// 6. FUNGSI UTAMA: Toggle Filter Kategori
function toggleCategory(categoryName, buttonElement) {
    buttonElement.classList.toggle('active');
    buttonElement.classList.toggle('off');

    let isActive = buttonElement.classList.contains('active');

    markersRegistry.forEach(item => {
        if (item.category === categoryName) {
            if (isActive) {
                item.marker.addTo(markersLayer);
            } else {
                markersLayer.removeLayer(item.marker);
            }
        }
    });
}

// 7. Logika Panel Form Tambah Lokasi
const formPanel = document.getElementById('form-panel');

function toggleForm() {
    if (formPanel.style.display === 'block') {
        formPanel.style.display = 'none';
    } else {
        formPanel.style.display = 'block';
    }
}

map.on('click', function(e) {
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng').value = e.latlng.lng.toFixed(6);
    formPanel.style.display = 'block';
});

// 8. Event Listener Submit Form ke GitHub API
document.getElementById('addForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nama = document.getElementById('nama').value;
    const kategori = document.getElementById('kategori').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const catatan = document.getElementById('catatan').value;

    let token = localStorage.getItem('github_pat');
    if (!token) {
        token = prompt("Masukkan Personal Access Token (PAT) GitHub Tuan Muda:");
        if (!token) return alert("Token diperlukan untuk menyimpan data!");
        localStorage.setItem('github_pat', token);
    }

    alert("Menyimpan data secara online ke GitHub...");

    try {
        const getFileUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
        
        const resGet = await fetch(getFileUrl, {
            headers: { 
                "Authorization": `token ${token}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });
        if (!resGet.ok) throw new Error("Gagal mengambil data file dari GitHub.");
        
        const fileData = await resGet.json();
        const sha = fileData.sha;
        
        let decodedContent = [];
        try {
            decodedContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        } catch (err) {
            console.warn("Format file kosong atau gagal di-parse.");
        }
        
        decodedContent.push({ nama, kategori, lat, lng, catatan });

        const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(decodedContent, null, 2))));

        const resPut = await fetch(getFileUrl, {
            method: 'PUT',
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github.v3+json"
            },
            body: JSON.stringify({
                message: `Tambah lokasi: ${nama} oleh Tuan Muda`,
                content: updatedContent,
                sha: sha
            })
        });

        if (!resPut.ok) {
            let errJson = await resPut.json();
            throw new Error(errJson.message || "Gagal mengunggah data.");
        }

        alert("Berhasil! Data tersimpan ke GitHub.");
        this.reset();
        formPanel.style.display = 'none';
        loadDataFromGitHub();

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan: " + error.message);
    }
});

// 9. Fungsionalitas Modal Animasi Retro (View More)
function openModal(nama, kategori, catatan) {
    map.closePopup();

    document.getElementById('modal-title').innerText = nama;
    document.getElementById('modal-category').innerText = kategori;
    document.getElementById('modal-desc').innerText = catatan;

    const modal = document.getElementById('info-modal');
    modal.style.display = 'block';
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('info-modal');
    modal.classList.remove('active');
    
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// 10. Fix Ukuran Peta Agar Tidak Pecah
setTimeout(function() {
    map.invalidateSize();
}, 300);