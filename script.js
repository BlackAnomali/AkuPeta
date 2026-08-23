// Inisialisasi Peta (Center Blitar)
var map = L.map('map').setView([-8.1018, 112.1623], 13);

// Layer Peta Dasar (CartoDB Positron yang bersih & estetik)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

// Variabel Layer Group untuk Marker UMKM
var markersLayer = L.layerGroup().addTo(map);

// Konfigurasi GitHub Repository untuk Sinkronisasi Online
const GITHUB_USER = "BlackAnomali";
const GITHUB_REPO = "AkuPeta";
const GITHUB_FILE_PATH = "data.json";

// Fungsi untuk Mengambil Data dari GitHub (data.json)
async function loadDataFromGitHub() {
    try {
        let response = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}?t=` + new Date().getTime());
        if (!response.ok) throw new Error("Gagal memuat data dari GitHub");
        let data = await response.json();
        renderMarkers(data);
    } catch (error) {
        console.error("Error memuat data:", error);
        // Fallback jika offline: coba ambil dari file lokal / localStorage
        loadLocalFallback();
    }
}

// Fungsi Menampilkan Marker ke Peta
function renderMarkers(dataList) {
    markersLayer.clearLayers();
    dataList.forEach(item => {
        var marker = L.marker([item.lat, item.lng]).addTo(markersLayer);
        marker.bindPopup(`<b>${item.nama}</b><br>${item.kategori}<br>${item.deskripsi || ''}`);
    });
}

// Fungsi Fallback Offline
function loadLocalFallback() {
    fetch('data.json')
        .then(res => res.json())
        .then(data => renderMarkers(data))
        .catch(err => console.log("Gagal memuat data lokal"));
}

// Jalankan saat pertama kali web dibuka
loadDataFromGitHub();

// Tombol Form Tambah Lokasi (Contoh Integrasi Simpan)
document.getElementById('form-lokasi').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nama = document.getElementById('nama').value;
    const kategori = document.getElementById('kategori').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const deskripsi = document.getElementById('deskripsi').value;

    // Ambil Token dari localStorage browser (biar aman dan tidak terlihat publik)
    let token = localStorage.getItem('github_pat');
    if (!token) {
        token = prompt("Masukkan Personal Access Token (PAT) GitHub Tuan Muda untuk izin simpan data:");
        if (!token) return alert("Token diperlukan untuk menyimpan data secara online!");
        localStorage.setItem('github_pat', token);
    }

    alert("Menyimpan data secara online ke GitHub...");

    try {
        // 1. Ambil isi file data.json terbaru beserta SHA-nya dari GitHub API
        const getFileUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
        const resGet = await fetch(getFileUrl, {
            headers: { "Authorization": `token ${token}` }
        });
        if (!resGet.ok) throw new Error("Gagal mengambil SHA file dari GitHub. Cek kembali Token Tuan Muda.");
        
        const fileData = await resGet.json();
        const sha = fileData.sha;
        
        // Dekode isi file lama dari Base64
        const decodedContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        
        // 2. Masukkan data baru ke dalam array
        decodedContent.push({ nama, kategori, lat, lng, deskripsi });

        // 3. Encode kembali ke Base64
        const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(decodedContent, null, 2))));

        // 4. Kirim pembaruan ke GitHub API (Commit otomatis di balik layar)
        const resPut = await fetch(getFileUrl, {
            method: 'PUT',
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Tambah data UMKM baru: ${nama} oleh Tuan Muda`,
                content: updatedContent,
                sha: sha
            })
        });

        if (!resPut.ok) throw new Error("Gagal mengunggah data ke GitHub.");

        alert("Berhasil! Data tersimpan secara online dan otomatis sinkron.");
        document.getElementById('form-lokasi').reset();
        loadDataFromGitHub(); // Refresh peta

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan: " + error.message);
    }
});