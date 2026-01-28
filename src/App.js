import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx'; 
import './App.css';

const STAFF_LIST = [
  "Noy Vathana", "Chou Sapha", "You Ly Hieng", "Chroeng Phanha",
  "Uy Mengsae", "Pha Chan Bory", "Chek Seang", "Som Tihak",
  "Touch Makara", "Chhon Sophanith"
];

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => i + 1);
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwv1bvSsiaPy5Azy7PVar_E6GAyGnnLKWndXOjQLVeIg-5C4yz4HexXR3L7vUU5tfqE-Q/exec';

function App() {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [formData, setFormData] = useState({ 
    date: '', // កំណត់ឱ្យនៅទំនេរពេលដំបូង
    in: '', 
    out: '', 
    reason: '' 
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState({ show: false, message: '', isSuccess: true });
  const [showTableModal, setShowTableModal] = useState(false);
  const [allData, setAllData] = useState([]);
  const [filterName, setFilterName] = useState('All');
  const [filterDay, setFilterDay] = useState('All');

  // --- Helpers ---
  const isValidTime = (time) => {
    if (!time) return true;
    return time.includes(':') && /^([0-9]|1[0-9]|2[0-3]):[0-5]?[0-9]$/.test(time);
  };

  const formatTimeOnBlur = (field) => {
    let val = formData[field].trim();
    if (!val) return;
    if (!val.includes(':') && /^\d+$/.test(val)) {
      if (val.length <= 2) val = val + ":00";
      else if (val.length === 3) val = val.slice(0, 1) + ":" + val.slice(1);
      else if (val.length === 4) val = val.slice(0, 2) + ":" + val.slice(2);
    }
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '--:--';
    const str = timeStr.toString().trim();
    let h, m;
    if (str.includes('T')) {
      const d = new Date(str);
      h = d.getHours(); m = d.getMinutes();
    } else if (str.includes(':')) {
      const parts = str.split(':');
      h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
    } else return str;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // តម្រៀបពីថ្ងៃថ្មីបំផុត មកថ្ងៃចាស់បំផុត
        const sortedData = data.sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });
        setAllData(sortedData);
      } else {
        setAllData([]);
      }
    } catch (error) { 
      console.error("Fetch Error:", error); 
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const getFilteredData = () => {
    return allData.filter(item => {
      const matchName = filterName === 'All' || item.name === filterName;
      const itemDay = item.date ? new Date(item.date).getDate() : null;
      return matchName && (filterDay === 'All' || itemDay === parseInt(filterDay));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.in.includes(':') || !formData.out.includes(':')) {
      setModal({ show: true, message: 'សូមប្រើសញ្ញា ":" ចន្លោះម៉ោង និងនាទី!', isSuccess: false });
      return;
    }
    setLoading(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ ...formData, name, no: Date.now() })
      });

      setModal({ show: true, message: 'បញ្ជូនទិន្នន័យជោគជ័យ! 🚀', isSuccess: true });
      
      // --- Clear Data ឱ្យនៅទំនេរទាំងអស់ ---
      setName('');
      setFormData({ date: '', in: '', out: '', reason: '' });
      setSuggestions([]);

      setTimeout(() => setModal(prev => ({ ...prev, show: false })), 5000);
      fetchHistory();
    } catch (err) {
      setModal({ show: true, message: 'មានបញ្ហាបច្ចេកទេស!', isSuccess: false });
    } finally { setLoading(false); }
  };

  const exportToExcel = () => {
    setExporting(true);
    setTimeout(() => {
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
      setExporting(false);
    }, 800);
  };

  return (
    <div className="app-container">
      <div className="form-card">
        <h2>បំពេញទម្រង់សុំច្បាប់បុគ្គលិក</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>ឈ្មោះបុគ្គលិក</label>
            <input type="text" value={name} placeholder="ឈ្មោះជាអក្សរ ENG" required 
              onChange={(e) => {
                setName(e.target.value);
                setSuggestions(e.target.value ? STAFF_LIST.filter(s => s.toLowerCase().includes(e.target.value.toLowerCase())) : []);
              }} 
            />
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
              <input type="text" placeholder="(Ex: 8:00)" value={formData.in} required
                className={formData.in && !isValidTime(formData.in) ? "input-error" : ""}
                onChange={e => setFormData({...formData, in: e.target.value.replace(/[^0-9:]/g, '')})}
                onBlur={() => formatTimeOnBlur('in')}
              />
            </div>
            <div className="input-group">
              <label>ម៉ោងចេញ</label>
              <input type="text" placeholder="(Ex : 17:00)" value={formData.out} required
                className={formData.out && !isValidTime(formData.out) ? "input-error" : ""}
                onChange={e => setFormData({...formData, out: e.target.value.replace(/[^0-9:]/g, '')})}
                onBlur={() => formatTimeOnBlur('out')}
              />
            </div>
          </div>

          <div className="input-group">
            <label>មូលហេតុ</label>
            <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="បញ្ជាក់មូលហេតុ..." required></textarea>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <div className="spinner-s"></div> : "បញ្ជូនទិន្នន័យ"}
          </button>
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
                  <option value="All">គ្រប់ថ្ងៃ</option>
                  {DAYS_LIST.map(d => <option key={d} value={d}>ថ្ងៃទី {d}</option>)}
                </select>
              </div>
              <button className="export-btn" onClick={exportToExcel} disabled={exporting}>
                {exporting ? <div className="spinner-s"></div> : "📥 Excel"}
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>ល.រ</th><th>ថ្ងៃទី ខែ ឆ្នាំ</th><th>ឈ្មោះ</th><th>ម៉ោង</th><th>មូលហេតុ</th></tr>
                </thead>
                <tbody>
                  {getFilteredData().length > 0 ? getFilteredData().map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{formatDateDMY(item.date)}</td>
                      <td className="name-cell">{item.name}</td>
                      <td>{formatTime12h(item.in)} - {formatTime12h(item.out)}</td>
                      <td>{item.reason}</td>
                    </tr>
                  )) : <tr><td colSpan="5" style={{textAlign:'center', padding:'20px'}}>មិនមានទិន្នន័យ...</td></tr>}
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