import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  List, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Droplets,
  Wrench,
  Coffee,
  Car
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

const INCOME_CATEGORIES = ['Argo/Tarikan', 'Tip Penumpang', 'Bonus/Insentif', 'Lainnya'];
const EXPENSE_CATEGORIES = ['Bensin', 'Makan & Minum', 'Parkir & Tol', 'Servis & Oli', 'Pulsa & Internet', 'Lainnya'];

// Format uang ke Rupiah
const formatRupiah = (angka) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(angka);
};

// Setup Konfigurasi Database
const firebaseConfig = {
  apiKey: "AIzaSyCYSi5awsOzOwmovyEaPIEhOEAHiwvNRFg",
  authDomain: "ojoltracker-e7b76.firebaseapp.com",
  projectId: "ojoltracker-e7b76",
  storageBucket: "ojoltracker-e7b76.firebasestorage.app",
  messagingSenderId: "538556126344",
  appId: "1:538556126344:web:13121b8d3a1fb18fb6fb3d",
  measurementId: "G-J46HHQHMC4"
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk menyimpan transaksi
  const [transactions, setTransactions] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income',
    category: INCOME_CATEGORIES[0],
    amount: '',
    note: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Effect: Autentikasi User (Agar data aman per-user)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Effect: Tarik Data Transaksi dari Cloud Storage
  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = [];
      snapshot.forEach(document => {
        data.push({ id: document.id, ...document.data() });
      });
      
      // Urutkan dari transaksi yang paling baru di bagian atas
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Error mengambil data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Kalkulasi untuk Dashboard (Bulan Ini)
  const currentMonthTotals = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach(trx => {
      const trxDate = new Date(trx.date);
      if (trxDate.getMonth() === currentMonth && trxDate.getFullYear() === currentYear) {
        if (trx.type === 'income') income += Number(trx.amount);
        if (trx.type === 'expense') expense += Number(trx.amount);
      }
    });

    return { income, expense, net: income - expense };
  }, [transactions]);

  // Handle Perubahan Input Form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Jika ganti tipe (Pemasukan/Pengeluaran), reset kategori ke default tipe tersebut
    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        category: value === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Simpan Transaksi Baru ke Database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(formData.amount) || !user) return;

    const newTrx = {
      ...formData,
      amount: Number(formData.amount),
      createdAt: new Date().toISOString()
    };

    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
      await addDoc(colRef, newTrx);
      
      // Reset form setelah sukses
      setFormData(prev => ({
        ...prev,
        amount: '',
        note: ''
      }));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Gagal menyimpan transaksi:", error);
    }
  };

  // Hapus Transaksi dari Database
  const handleDelete = async (id) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Gagal menghapus transaksi:", error);
    }
  };

  // --- KOMPONEN TAB ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-sm font-medium opacity-90 mb-1">Pendapatan Bersih (Bulan Ini)</p>
        <h2 className="text-3xl font-bold mb-4">{formatRupiah(currentMonthTotals.net)}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <div className="flex items-center text-sm opacity-90 mb-1">
              <TrendingUp className="w-4 h-4 mr-1" /> Pemasukan
            </div>
            <p className="font-semibold">{formatRupiah(currentMonthTotals.income)}</p>
          </div>
          <div>
            <div className="flex items-center text-sm opacity-90 mb-1">
              <TrendingDown className="w-4 h-4 mr-1" /> Pengeluaran
            </div>
            <p className="font-semibold">{formatRupiah(currentMonthTotals.expense)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">Aktivitas Terbaru</h3>
        {transactions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-4">
            {transactions.slice(0, 5).map(trx => (
              <div key={trx.id} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full mr-3 ${trx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {trx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{trx.category}</p>
                    <p className="text-xs text-slate-500">{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {trx.note || '-'}</p>
                  </div>
                </div>
                <p className={`font-semibold text-sm ${trx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {trx.type === 'income' ? '+' : '-'}{formatRupiah(trx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAdd = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Wallet className="w-6 h-6 mr-2 text-green-500" />
          Catat Transaksi Baru
        </h2>

        {showSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200 text-center font-medium">
            ✅ Transaksi berhasil dicatat!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input 
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleInputChange({ target: { name: 'type', value: 'income' }})}
              className={`p-3 rounded-xl border font-medium text-sm flex items-center justify-center transition-all ${formData.type === 'income' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              <TrendingUp className="w-4 h-4 mr-2" /> Pemasukan
            </button>
            <button
              type="button"
              onClick={() => handleInputChange({ target: { name: 'type', value: 'expense' }})}
              className={`p-3 rounded-xl border font-medium text-sm flex items-center justify-center transition-all ${formData.type === 'expense' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              <TrendingDown className="w-4 h-4 mr-2" /> Pengeluaran
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
            <input 
              type="number" 
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="Contoh: 50000"
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catatan (Opsional)</label>
            <input 
              type="text" 
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Contoh: Bensin full tank / Makan siang"
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-md transition-colors mt-2"
          >
            Simpan Transaksi
          </button>
        </form>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 h-full flex flex-col">
      <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Riwayat Lengkap</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-4 flex-1">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <List className="w-12 h-12 mb-2 opacity-20" />
              <p>Belum ada catatan.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map(trx => (
                <div key={trx.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex items-center">
                     <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${trx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {trx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{trx.category}</p>
                      <div className="flex items-center text-xs text-slate-500 mt-0.5">
                        <span>{new Date(trx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {trx.note && <span className="mx-1">•</span>}
                        {trx.note && <span className="truncate max-w-[100px]">{trx.note}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`font-bold text-sm ${trx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {trx.type === 'income' ? '+' : '-'}{formatRupiah(trx.amount)}
                    </p>
                    <button 
                      onClick={() => {
                        // eslint-disable-next-line no-restricted-globals
                        if(confirm('Hapus data ini?')) handleDelete(trx.id)
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500 mt-1 uppercase font-semibold tracking-wider"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTips = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 pb-8">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold flex items-center mb-2">
          <Lightbulb className="w-6 h-6 mr-2" /> Strategi Irit Bensin
        </h2>
        <p className="text-amber-50 opacity-90 text-sm">Terapkan trik ini untuk menekan pengeluaran bensin dan memaksimalkan untung harianmu.</p>
      </div>

      <div className="space-y-4">
        {/* Tip 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-3">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">1. Perawatan Kendaraan</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 ml-12 list-disc pr-4">
            <li><strong>Tekanan Angin Ban:</strong> Ban yang kurang angin bikin tarikan berat dan bensin sangat boros. Cek minimal seminggu sekali.</li>
            <li><strong>Servis CVT (Matic) & Rantai (Manual):</strong> Debu di CVT bikin selip dan tarikan mesin ngempos. Rantai yang kendor juga membuang tenaga mesin.</li>
            <li><strong>Ganti Oli Rutin:</strong> Mesin yang terlumasi dengan baik bekerja lebih ringan.</li>
          </ul>
        </div>

        {/* Tip 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-600 mr-3">
              <Car className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">2. Gaya Berkendara (Eco Riding)</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 ml-12 list-disc pr-4">
            <li><strong>Urut Gas, Jangan Digeber:</strong> Tarik tuas gas pelan-pelan (diurut). Hindari "stop and go" yang agresif atau sering menghentak gas.</li>
            <li><strong>Jaga Jarak & Manfaatkan Momentum:</strong> Kalau di depan sudah terlihat lampu merah atau macet, lepas gas dari jauh dan biarkan motor meluncur perlahan. Hindari rem mendadak lalu ngegas lagi.</li>
            <li><strong>Matikan Mesin:</strong> Jika berhenti di lampu merah yang detiknya lama (&gt;60 detik) atau saat menunggu resto nyiapin makanan (GoFood/GrabFood), matikan mesin.</li>
          </ul>
        </div>

        {/* Tip 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600 mr-3">
              <Droplets className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">3. Strategi Milih Spot (Nge-bid)</h3>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 ml-12 list-disc pr-4">
            <li><strong>Jangan Muter-muter Kosong:</strong> Keliling mencari orderan tanpa arah membuang bensin sia-sia. Lebih baik "ngetem" di spot strategis (stasiun, mall, perkantoran) pada jam yang tepat.</li>
            <li><strong>Kenali Jam Sibuk:</strong> Pagi (arah ke kantor/sekolah), Siang (jam makan siang resto), Sore (jam pulang). Posisikan diri di dekat sumber orderan sebelum jamnya tiba.</li>
            <li><strong>Gunakan Maps Pintar:</strong> Walau tahu jalan, cek Maps untuk melihat jalur merah (macet). Kadang memutar sedikit lewat jalan lancar lebih irit bensin dan waktu dibanding antre di kemacetan parah.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center text-green-600">
          <Car className="w-12 h-12 mb-4 animate-bounce" />
          <p className="font-semibold animate-pulse">Menyiapkan Buku Kas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-green-600 tracking-tight">OjolTracker</h1>
          <p className="text-xs text-slate-500 font-medium">Rekap Harian & Bulanan</p>
        </div>
        <div className="bg-slate-100 p-2 rounded-full">
          <Coffee className="w-5 h-5 text-slate-600" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto p-4 h-full">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'add' && renderAdd()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'tips' && renderTips()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-20">
        <div className="max-w-md mx-auto flex justify-around items-center p-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === 'dashboard' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Home className={`w-6 h-6 mb-1 ${activeTab === 'dashboard' ? 'fill-green-100' : ''}`} />
            <span className="text-[10px] font-semibold">Ringkasan</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('add')}
            className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === 'add' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`rounded-full p-1.5 mb-1 ${activeTab === 'add' ? 'bg-green-100' : ''}`}>
               <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold">Catat</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === 'history' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List className={`w-6 h-6 mb-1 ${activeTab === 'history' ? 'fill-green-100' : ''}`} />
            <span className="text-[10px] font-semibold">Riwayat</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tips')}
            className={`flex flex-col items-center p-2 w-16 transition-colors ${activeTab === 'tips' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Lightbulb className={`w-6 h-6 mb-1 ${activeTab === 'tips' ? 'fill-green-100' : ''}`} />
            <span className="text-[10px] font-semibold">Tips Irit</span>
          </button>
        </div>
      </nav>
    </div>
  );
}