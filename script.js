// ==========================================
// AKUPETA // SCRIPT UTAMA & FILTER KATEGORI
// ==========================================

// 1. Inisialisasi Peta (Center Blitar)
let map = L.map('map', {
    zoomControl: false 
}).setView([-8.1018, 112.1648], 14);

// Pindahkan posisi kontrol zoom ke kanan atas
L.control.zoom({ position: 'topleft' }).addTo(map);

// Menggunakan Tile Layer CartoDB Dark Matter (Peta Dark Mode Taktis)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// 2. Array global untuk mencatat marker yang tampil (Penting untuk Filter Toggle)
let markersRegistry = [];

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

// 4. Fungsi untuk Menambahkan Marker ke Peta dan Mendaftarkannya ke Registry
function addMarkerToMap(item) {
    let marker = L.marker([item.lat, item.lng], { 
        icon: getCustomIcon(item.kategori) 
    }).bindPopup(`
        <strong>${item.nama}</strong><br>
        <span style="color: #fca5a5;">Kategori: ${item.kategori}</span>
        <hr style="border:0; border-top:1px solid #dc2626; margin:6px 0;">
        ${item.catatan || ''}
    `);

    // Catat ke dalam array registry untuk fitur filter toggle
    markersRegistry.push({
        category: item.kategori,
        marker: marker
    });

    // Tampilkan marker ke peta secara default
    marker.addTo(map);
}

// 5. Mengambil Data dari file data.json
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Gagal mengambil data.json');
        }
        return response.json();
    })
    .then(data => {
        data.forEach(item => {
            addMarkerToMap(item);
        });
    })
    .catch(error => console.error('Error memuat JSON:', error));

// 6. FUNGSI UTAMA: Toggle Filter Kategori (Hide / Show Marker)
function toggleCategory(categoryName, buttonElement) {
    // Ubah visual tombol (aktif / off)
    buttonElement.classList.toggle('active');
    buttonElement.classList.toggle('off');

    let isActive = buttonElement.classList.contains('active');

    // Sembunyikan atau tampilkan marker berdasarkan kategori yang diklik
    markersRegistry.forEach(item => {
        if (item.category === categoryName) {
            if (isActive) {
                item.marker.addTo(map); // Munculkan kembali marker
            } else {
                map.removeLayer(item.marker); // Sembunyikan marker dari peta
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

// Ambil koordinat saat peta diklik untuk form
map.on('click', function(e) {
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lng').value = e.latlng.lng.toFixed(6);
    formPanel.style.display = 'block';
});

// Handle Submit Form Tambah Lokasi Baru
document.getElementById('addForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    let newItem = {
        nama: document.getElementById('nama').value,
        kategori: document.getElementById('kategori').value,
        catatan: document.getElementById('catatan').value,
        lat: parseFloat(document.getElementById('lat').value),
        lng: parseFloat(document.getElementById('lng').value)
    };

    // Tambahkan ke peta & registry
    addMarkerToMap(newItem);

    // Reset form dan tutup panel
    this.reset();
    formPanel.style.display = 'none';
});

// 8. Fix Ukuran Peta Agar Titik Koordinat Tidak Geser
setTimeout(function() {
    map.invalidateSize();
}, 200);