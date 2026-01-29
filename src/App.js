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
  const [formData, setFormData] = useState({ date: '', in: '', out: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modal, setModal] = useState({ show: false, message: '', isSuccess: true });
  const [showTableModal, setShowTableModal] = useState(false);
  const [allData, setAllData] = useState([]);
  const [filterName, setFilterName] = useState('All');
  const [filterDay, setFilterDay] = useState('All');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // --- Manager States ---
  const [isManager, setIsManager] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [auth, setAuth] = useState({ name: '', phone: '' });

  // --- Check Session on Load ---
  useEffect(() => {
    const storedTime = localStorage.getItem('managerLoginTime');
    if (storedTime && Date.now() - storedTime < 30 * 60 * 1000) {
      setIsManager(true);
    }
  }, []);

  const handleLogin = () => {
    if (auth.name.toLowerCase() === "khim saron" && auth.phone === "0973674767") {
      localStorage.setItem('managerLoginTime', Date.now());
      setIsManager(true);
      setShowLoginModal(false);
      setAuth({ name: '', phone: '' });
    } else {
      alert("ឈ្មោះ ឬលេខទូរស័ព្ទមិនត្រឹមត្រូវ!");
    }
  };

  const handleLogout = () => {
    if (window.confirm("តើអ្នកពិតជាចង់ Logout មែនទេ?")) {
      localStorage.removeItem('managerLoginTime');
      setIsManager(false);
    }
  };
// កូដសម្រាប់ Update Status (Approve/Reject)
  const updateStatus = async (no, newStatus) => {
    setLoading(true);
    try {
      // បញ្ជូនតាម Query String (GET)
      const url = `${SCRIPT_URL}?action=approve&no=${no}&status=${newStatus}`;
      
      await fetch(url, { 
        method: 'GET',
        mode: 'no-cors' // បង្ការបញ្ហា Block ពី Browser
      });

      // រង់ចាំ ១ វិនាទីដើម្បីឱ្យ Google Sheet ធ្វើការចប់សិន ចាំទាញទិន្នន័យថ្មី
      setTimeout(() => {
        fetchHistory();
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error("Update error:", err);
      setLoading(false);
    }
  };

  // កូដសម្រាប់ Delete
  const deleteEntry = async (no) => {
    if (!window.confirm("តើអ្នកចង់លុបទិន្នន័យនេះមែនទេ?")) return;
    setLoading(true);
    try {
      const url = `${SCRIPT_URL}?action=delete&no=${no}`;
      
      await fetch(url, { 
        method: 'GET',
        mode: 'no-cors'
      });

      // រង់ចាំ ១ វិនាទីដូចគ្នា
      setTimeout(() => {
        fetchHistory();
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error("Delete error:", err);
      setLoading(false);
    }
  };
  const triggerErrorEffects = useCallback(() => {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
  }, []);

  const isValidTime = (time) => {
    if (!time) return true;
    return /^([0-9]|1[0-9]|2[0-3]):[0-5]?[0-9]$/.test(time);
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
      const d = new Date(str); h = d.getHours(); m = d.getMinutes();
    } else if (str.includes(':')) {
      const parts = str.split(':'); h = parseInt(parts[0], 10); m = parseInt(parts[1], 10);
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
        setAllData(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
      }
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (name && formData.date && allData.length > 0) {
      const inputName = name.trim().toLowerCase();
      const inputDate = formData.date;
      const found = allData.some(item => {
        if (!item.date || !item.name) return false;
        let itemDateStr = item.date.includes('T') ? new Date(item.date).toLocaleDateString('en-CA') : item.date;
        return item.name.toLowerCase().trim() === inputName && itemDateStr === inputDate;
      });
      if (found) {
        setIsDuplicate(true); triggerErrorEffects();
        const waitTime = 4; setCountdown(waitTime);
        setModal({ show: true, message: `🚫 ស្ទួនថ្ងៃហើយ! ${name} បានបំពេញរួចហើយ។`, isSuccess: false });
        const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        setTimeout(() => {
          clearInterval(timer); setFormData(prev => ({ ...prev, date: '' }));
          setIsDuplicate(false); setModal(prev => ({ ...prev, show: false }));
          setCountdown(0);
        }, waitTime * 1000);
        return () => clearInterval(timer);
      } else { setIsDuplicate(false); }
    }
  }, [name, formData.date, allData, triggerErrorEffects]);

  const getFilteredData = () => {
    return allData.filter(item => {
      const matchName = filterName === 'All' || item.name === filterName;
      const itemDay = item.date ? new Date(item.date).getDate() : null;
      return matchName && (filterDay === 'All' || itemDay === parseInt(filterDay));
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDuplicate) return;
    setLoading(true);
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ ...formData, name, no: Date.now(), status: 'Pending' })
      });
      setModal({ show: true, message: 'បញ្ជូនទិន្នន័យជោគជ័យ!', isSuccess: true });
      setName(''); setFormData({ date: '', in: '', out: '', reason: '' });
      fetchHistory();
    } catch (err) { setModal({ show: true, message: 'កំហុសបច្ចេកទេស!', isSuccess: false }); }
    finally { setLoading(false); setTimeout(() => setModal(prev => ({ ...prev, show: false })), 4000); }
  };

  const exportToExcel = () => {
    setExporting(true);
    setTimeout(() => {
      const dataToExport = getFilteredData().map((item, index) => ({
        "ល.រ": index + 1, "ថ្ងៃខែ": formatDateDMY(item.date), "ឈ្មោះ": item.name,
        "ម៉ោងចូល": formatTime12h(item.in), "ម៉ោងចេញ": formatTime12h(item.out), "មូលហេតុ": item.reason, "ស្ថានភាព": item.status || "Pending"
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `Report_${new Date().toLocaleDateString()}.xlsx`);
      setExporting(false);
    }, 800);
  };

  return (
    <div className="app-container ">

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
            <label className={isDuplicate ? "label-error" : ""}>កាលបរិច្ឆេទ</label>
            <input type="date" value={formData.date} required className={isDuplicate ? "input-duplicate-error" : ""}
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
          </div>
          <div className="time-row">
            <div className="input-group">
              <label>ម៉ោងចូល</label>
              <input type="text" placeholder="ឧទាហរណ៍ ៖ 8:00" value={formData.in} required
                className={formData.in && !isValidTime(formData.in) ? "input-error" : ""}
                onChange={e => setFormData({...formData, in: e.target.value.replace(/[^0-9:]/g, '')})}
                onBlur={() => formatTimeOnBlur('in')}
              />
            </div>
            <div className="input-group">
              <label>ម៉ោងចេញ</label>
              <input type="text" placeholder="ឧទាហរណ៍ ៖ 17:00" value={formData.out} required
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
          <button type="submit" className="submit-btn" disabled={loading || isDuplicate}>
            {loading ? <div className="spinner-s"></div> : "បញ្ជូនទិន្នន័យ"}
          </button>
        </form>
        <button className="view-list-btn" onClick={() => setShowTableModal(true)}>មើលបញ្ជីអ្នកសុំច្បាប់</button>
      </div>

      <div className="admin-controls">
        {!isManager ? (
          <button className="manager-lock-btn" onClick={() => setShowLoginModal(true)}>🔒 Manager Login</button>
        ) : (
          <button className="manager-logout-btn" onClick={handleLogout}>🔓 Logout Manager</button>
        )}
      </div>

      {showLoginModal && (
        <div className="modal-overlay">
          <div className="login-card">
            <div className="login-header"><h3>Manager Login</h3></div>
            <div className="input-group">
              <label>ឈ្មោះ Manager</label>
              <input type="text" value={auth.name} onChange={e => setAuth({...auth, name: e.target.value})} placeholder="ឈ្មោះ Manager" />
            </div>
            <div className="input-group">
              <label>លេខសម្ងាត់</label>
              <input type="password" value={auth.phone} onChange={e => setAuth({...auth, phone: e.target.value})} placeholder="******" />
            </div>
            <button className="login-confirm-btn" onClick={handleLogin}>ផ្ទៀងផ្ទាត់</button>
            <button className="view-list-btn" onClick={() => setShowLoginModal(false)}>បិទ</button>
          </div>
        </div>
      )}

      {showTableModal && (
        <div className="modal-overlay">
          <div className="table-modal-card">
            <div className="modal-header">
              <h3>បញ្ជីអ្នកសុំច្បាប់</h3>
              <button className="close-modal-btn" onClick={() => setShowTableModal(false)}>&times;</button>
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
              <button className="export-btn" onClick={exportToExcel} disabled={exporting}>📥 Excel</button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ល.រ</th><th>ថ្ងៃខែ</th><th>ឈ្មោះ</th><th>ម៉ោង</th><th>មូលហេតុ</th><th>ស្ថានភាព</th>
                    {isManager && <th>សកម្មភាព</th>}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredData().map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{formatDateDMY(item.date)}</td>
                      <td className="name-cell">{item.name}</td>
                      <td>{formatTime12h(item.in)} - {formatTime12h(item.out)}</td>
                      <td>{item.reason}</td>
                      <td><span className={`status-badge ${(item.status || 'Pending').toLowerCase()}`}>{item.status || 'Pending'}</span></td>
                      {isManager && (
                        <td>
                          <div className="action-btns">
                            <button className="btn-approve" onClick={() => updateStatus(item.no, 'Approved')}>✅</button>
                            <button className="btn-reject" onClick={() => updateStatus(item.no, 'Rejected')}>❌</button>
                            <button className="btn-reject" style={{background:'#fff0f0', color:'#ff4d4f'}} onClick={() => deleteEntry(item.no)}>លុប</button>
                          </div>
                        </td>
                      )}
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
            {!modal.isSuccess && countdown > 0 ? (
              <div className="countdown-container">
                <svg className="countdown-svg" viewBox="0 0 32 32">
                  <circle r="13.5" cx="16" cy="16" className="track"></circle>
                  <circle r="13.5" cx="16" cy="16" className="bar" style={{ strokeDashoffset: (countdown / 4) * 84 - 84 }}></circle>
                </svg>
                <div className="countdown-number">{countdown}</div>
              </div>
            ) : <div className="icon">{modal.isSuccess ? '✅' : '❌'}</div>}
            <p>{modal.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;