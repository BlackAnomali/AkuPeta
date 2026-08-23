// Inisialisasi Peta (Center Blitar)
var map = L.map('map').setView([-8.0954, 112.1609], 14);

// Layer Peta Dasar (Bisa diganti CartoDB atau tetap standar OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let tempMarker = null;
var markersLayer = L.layerGroup().addTo(map);

// Konfigurasi GitHub Repository untuk Sinkronisasi Online
const GITHUB_USER = "BlackAnomali";
const GITHUB_REPO = "AkuPeta";
const GITHUB_FILE_PATH = "data.json";

// Fungsi untuk Buka-Tutup Form Input
function toggleForm() {
    var panel = document.getElementById('form-panel');
    var btn = document.getElementById('toggle-btn');
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        btn.innerText = '+ Tambah Lokasi';
    } else {
        panel.style.display = 'block';
        btn.innerText = 'Tutup Form';
    }
}

// Klik peta untuk mengambil koordinat & buat marker sementara
map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;

    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    tempMarker = L.marker([lat, lng]).addTo(map)
        .bindPopup("Titik yang dipilih").openPopup();
});

// Fungsi Mengatur Ikon Kustom Berdasarkan Kategori
function getCustomIcon(kategori) {
    let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';

    if (kategori === 'Kuliner') {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
    } else if (kategori === 'Pedagang Keliling') {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
    } else if (kategori === 'Jasa / Lainnya') {
        iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png';
    }

    return L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// Fungsi Memuat Data dari GitHub (data.json)
async function loadDataFromGitHub() {
    try {
        let response = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}?t=` + new Date().getTime());
        if (!response.ok) throw new Error("Gagal memuat data dari GitHub");
        let data = await response.json();
        renderMarkers(data);
    } catch (error) {
        console.error("Error memuat data:", error);
    }
}

// Fungsi Menampilkan Marker ke Peta
function renderMarkers(dataList) {
    markersLayer.clearLayers();
    dataList.forEach(item => {
        var customIcon = getCustomIcon(item.kategori);
        var marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(markersLayer);
        
        var popupContent = `
            <b>${item.nama}</b><br>
            <span style="color: #666; font-size: 0.9em;">Kategori: ${item.kategori}</span><hr style="margin: 5px 0;">
            ${item.catatan || ''}
        `;
        marker.bindPopup(popupContent);
    });
}

// Jalankan saat pertama kali web dibuka
loadDataFromGitHub();

// Event Listener Submit Form untuk Kirim Langsung ke GitHub API
document.getElementById('addForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nama = document.getElementById('nama').value;
    const kategori = document.getElementById('kategori').value;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const catatan = document.getElementById('catatan').value;

    // Ambil Token dari localStorage browser
    let token = localStorage.getItem('github_pat');
    if (!token) {
        token = prompt("Masukkan Personal Access Token (PAT) GitHub Tuan Muda untuk izin simpan data:");
        if (!token) return alert("Token diperlukan untuk menyimpan data secara online!");
        localStorage.setItem('github_pat', token);
    }

    alert("Menyimpan data secara online ke GitHub...");

    try {
        const getFileUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
        const resGet = await fetch(getFileUrl, {
            headers: { "Authorization": `token ${token}` }
        });
        if (!resGet.ok) throw new Error("Gagal mengambil SHA file dari GitHub. Cek kembali Token Tuan Muda.");
        
        const fileData = await resGet.json();
        const sha = fileData.sha;
        
        // Dekode isi file lama dari Base64
        const decodedContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        
        // Masukkan data baru ke dalam array
        decodedContent.push({ nama, kategori, lat, lng, catatan });

        // Encode kembali ke Base64
        const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(decodedContent, null, 2))));

        // Kirim pembaruan ke GitHub API
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

        alert("Berhasil! Data tersimpan secara online.");
        document.getElementById('addForm').reset();
        toggleForm();
        loadDataFromGitHub(); // Refresh peta otomatis

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan: " + error.message);
    }
});