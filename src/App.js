import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx'; 
import './App.css';

const STAFF_LIST = [
  "Noy Vathana", "Chou Sapha", "You Ly Hieng", "Chroeng Phanha",
  "Uy Mengsae", "Pha Chan Bory", "Chek Seang", "Som Tihak",
  "Touch Makara", "Chhon Sophanith"
];

// បង្កើតបញ្ជីថ្ងៃពី 1 ដល់ 31
const DAYS_LIST = Array.from({ length: 31 }, (_, i) => i + 1);

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwv1bvSsiaPy5Azy7PVar_E6GAyGnnLKWndXOjQLVeIg-5C4yz4HexXR3L7vUU5tfqE-Q/exec';

function App() {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [formData, setFormData] = useState({ date: '', in: '', out: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: '', isSuccess: true });
  const [showTableModal, setShowTableModal] = useState(false);
  const [allData, setAllData] = useState([]);
  
  // State សម្រាប់ Filter
  const [filterName, setFilterName] = useState('All');
  const [filterDay, setFilterDay] = useState('All');

  // មុខងារបំប្លែងកាលបរិច្ឆេទទៅជា DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '00:00';
    let h, m;
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
      const d = new Date(timeStr);
      h = d.getHours();
      m = d.getMinutes();
    } else {
      const parts = String(timeStr).split(':');
      h = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
    }
    h = h % 12 || 12; 
    return `${h.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}`;
  };

  // មុខងារ Filter ទិន្នន័យ
  const getFilteredData = () => {
    return allData.filter(item => {
      const matchName = filterName === 'All' || item.name === filterName;
      const itemDay = item.date ? new Date(item.date).getDate() : null;
      const matchDay = filterDay === 'All' || itemDay === parseInt(filterDay);
      return matchName && matchDay;
    });
  };

  const exportToExcel = () => {
    const dataToExport = getFilteredData().map((item, index) => ({
      "ល.រ": index + 1,
      "ថ្ងៃខែ": formatDateDMY(item.date),
      "ឈ្មោះ": item.name,
      "ម៉ោងចូល": formatTime12h(item.in),
      "ម៉ោងចេញ": formatTime12h(item.out),
      "មូលហេតុ": item.reason
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      setAllData(Array.isArray(data) ? data.reverse() : []);
    } catch (error) { console.error("Fetch Error:", error); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleNameInput = (e) => {
    const val = e.target.value;
    setName(val);
    setSuggestions(val ? STAFF_LIST.filter(s => s.toLowerCase().includes(val.toLowerCase())) : []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ ...formData, name, no: Date.now() })
      });
      setModal({ show: true, message: 'បញ្ជូនទិន្នន័យជោគជ័យ!', isSuccess: true });
      setTimeout(() => setModal({ show: false, message: '', isSuccess: true }), 5000);
      fetchHistory();
      setName('');
      setFormData({ date: '', in: '', out: '', reason: '' });
    } catch (err) {
      setModal({ show: true, message: 'មានបញ្ហាបច្ចេកទេស!', isSuccess: false });
    } finally { setLoading(false); }
  };

  return (
    <div className="app-container">
      <div className="form-card">
        <h2>📝 បំពេញទម្រង់សុំច្បាប់</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>ឈ្មោះបុគ្គលិក</label>
            <input type="text" value={name} onChange={handleNameInput} placeholder="ឈ្មោះជាអក្សរ ENG" required />
            {suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s, i) => <li key={i} onClick={() => { setName(s); setSuggestions([]); }}>{s}</li>)}
              </ul>
            )}
          </div>

          <div className="input-group">
            <label>កាលបរិច្ឆេទ</label>
            <input type="date" value={formData.date} required onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>

          <div className="time-row">
            <div className="input-group">
              <label>ម៉ោងចូល</label>
              <input type="text" placeholder="--:--" value={formData.in} onChange={e => setFormData({...formData, in: e.target.value.replace(/[^0-9:]/g, '')})} />
            </div>
            <div className="input-group">
              <label>ម៉ោងចេញ</label>
              <input type="text" placeholder="--:--" value={formData.out} onChange={e => setFormData({...formData, out: e.target.value.replace(/[^0-9:]/g, '')})} />
            </div>
          </div>

          <div className="input-group">
            <label>មូលហេតុ</label>
            <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>{loading ? "កំពុងរក្សាទុក..." : "បញ្ជូនទិន្នន័យ"}</button>
        </form>
        <button className="view-list-btn" onClick={() => setShowTableModal(true)}>មើលបញ្ជីឈ្មោះឈប់សម្រាក</button>
      </div>

      {showTableModal && (
        <div className="modal-overlay">
          <div className="table-modal-card">
            <div className="modal-header">
              <h3>បញ្ជីអ្នកសុំច្បាប់</h3>
              <span className="close-modal-btn" onClick={() => setShowTableModal(false)}>&times;</span>
            </div>
            
            <div className="filter-bar">
              <div className="filter-controls">
                <select value={filterName} onChange={(e) => setFilterName(e.target.value)}>
                  <option value="All">គ្រប់ឈ្មោះ</option>
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
                  <option value="All">គ្រប់ថ្ងៃ (1-31)</option>
                  {DAYS_LIST.map(d => <option key={d} value={d}>ថ្ងៃទី {d}</option>)}
                </select>
              </div>
              <button className="export-btn" onClick={exportToExcel}>📥 Excel</button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>ល.រ</th><th>ថ្ងៃទី ខែ ឆ្នាំ</th><th>ឈ្មោះ</th><th>ម៉ោង</th><th>មូលហេតុ</th></tr>
                </thead>
                <tbody>
                  {getFilteredData().map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{formatDateDMY(item.date)}</td>
                      <td className="name-cell">{item.name}</td>
                      <td>{formatTime12h(item.in)} - {formatTime12h(item.out)}</td>
                      <td>{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modal.show && (
        <div className="modal-overlay">
          <div className={`modal-card ${modal.isSuccess ? 'success' : 'error'}`}>
            <span className="close-x" onClick={() => setModal({ ...modal, show: false })}>&times;</span>
            <div className="icon">{modal.isSuccess ? '✅' : '❌'}</div>
            <p>{modal.message}</p>
            <div className="progress-bar"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;