let periods = JSON.parse(localStorage.getItem('periods')) || {};
let currentPeriod = localStorage.getItem('currentPeriod') || '';
let darkMode = localStorage.getItem('darkMode') === 'true';
let currentUser = null;

// Create default period
if (!currentPeriod && Object.keys(periods).length === 0) {
    currentPeriod = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    periods[currentPeriod] = [];
    save();
}

if (darkMode) document.body.classList.add('dark-mode');

// Dark mode
document.getElementById('darkModeToggle').onclick = () => {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkMode);
    document.getElementById('darkModeToggle').textContent = darkMode ? '☀️' : '🌙';
};

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    };
});

// Category inputs
document.querySelectorAll('.cat-input').forEach(input => {
    input.onkeypress = (e) => {
        if (e.key === 'Enter') addTransaction(input);
    };
    input.onblur = () => addTransaction(input);
});

// Period buttons
document.getElementById('newPeriodBtn').onclick = () => {
    document.getElementById('modalTitle').textContent = 'Create Period';
    document.getElementById('periodName').value = '';
    document.getElementById('periodModal').style.display = 'block';
    document.getElementById('periodName').focus();
};

document.getElementById('editPeriodBtn').onclick = () => {
    if (!currentPeriod) return alert('Select a period first');
    document.getElementById('modalTitle').textContent = 'Edit Period';
    document.getElementById('periodName').value = currentPeriod;
    document.getElementById('periodModal').style.display = 'block';
    document.getElementById('periodName').focus();
};

document.getElementById('savePeriodBtn').onclick = savePeriod;
document.getElementById('cancelPeriodBtn').onclick = () => {
    document.getElementById('periodModal').style.display = 'none';
};

document.getElementById('periodSelect').onchange = (e) => {
    currentPeriod = e.target.value;
    save();
    updateUI();
};

document.getElementById('syncBtn').onclick = syncNow;

function addTransaction(input) {
    if (!currentPeriod) return alert('Select a period first');
    
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) return;
    
    const transaction = {
        id: Date.now(),
        type: input.dataset.type,
        category: input.dataset.category,
        amount: amount,
        date: new Date().toISOString().split('T')[0]
    };
    
    if (!periods[currentPeriod]) periods[currentPeriod] = [];
    periods[currentPeriod].unshift(transaction);
    
    input.value = '';
    save();
    updateUI();
}

function deleteTransaction(id) {
    if (!confirm('Delete?')) return;
    periods[currentPeriod] = periods[currentPeriod].filter(t => t.id !== id);
    save();
    updateUI();
}

function savePeriod() {
    const name = document.getElementById('periodName').value.trim();
    if (!name) return;
    
    const isEdit = document.getElementById('modalTitle').textContent === 'Edit Period';
    
    if (isEdit && name !== currentPeriod) {
        periods[name] = periods[currentPeriod];
        delete periods[currentPeriod];
        currentPeriod = name;
    } else if (!isEdit) {
        if (periods[name]) return alert('Period exists');
        periods[name] = [];
        currentPeriod = name;
    }
    
    document.getElementById('periodModal').style.display = 'none';
    save();
    updatePeriodSelect();
    updateUI();
}

function updatePeriodSelect() {
    const select = document.getElementById('periodSelect');
    select.innerHTML = '<option value="">Select period...</option>' +
        Object.keys(periods).map(p => 
            `<option value="${p}" ${p === currentPeriod ? 'selected' : ''}>${p}</option>`
        ).join('');
}

function updateUI() {
    const transactions = periods[currentPeriod] || [];
    
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('totalIncome').textContent = `${income.toFixed(2)} PLN`;
    document.getElementById('totalExpenses').textContent = `${expenses.toFixed(2)} PLN`;
    document.getElementById('balance').textContent = `${(income - expenses).toFixed(2)} PLN`;
    
    const totals = {};
    transactions.forEach(t => {
        const key = `${t.category}-${t.type}`;
        totals[key] = (totals[key] || 0) + t.amount;
    });
    
    document.querySelectorAll('.cat-total').forEach(span => {
        const key = `${span.dataset.category}-${span.dataset.type}`;
        const total = totals[key] || 0;
        span.textContent = `${total.toFixed(2)} PLN`;
        span.style.fontWeight = total > 0 ? 'bold' : 'normal';
    });
    
    document.getElementById('transactionsList').innerHTML = transactions
        .map(t => `
            <div class="transaction-item">
                <div>
                    <div style="font-weight:500">${t.category}</div>
                    <div style="font-size:0.85em;color:var(--text-light)">${t.date}</div>
                </div>
                <span style="font-weight:600;color:${t.type === 'income' ? 'var(--income)' : 'var(--expense)'}">
                    ${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)} PLN
                </span>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">×</button>
            </div>
        `).join('') || '<p style="padding:20px;color:var(--text-light)">No transactions</p>';
}

function save() {
    localStorage.setItem('periods', JSON.stringify(periods));
    localStorage.setItem('currentPeriod', currentPeriod);
    if (currentUser) saveToCloud();
}

async function syncNow() {
    if (!window.auth) return alert('Loading...');
    
    if (!currentUser) {
        try {
            const provider = new window.GoogleAuthProvider();
            const result = await window.signInWithPopup(window.auth, provider);
            currentUser = result.user;
            document.getElementById('syncBtn').textContent = '☁️ ' + currentUser.email.split('@')[0];
            await loadFromCloud();
        } catch (error) {
            alert('Login failed');
        }
    } else {
        await saveToCloud();
        alert('✅ Synced!');
    }
}

async function saveToCloud() {
    if (!currentUser) return;
    
    try {
        const docRef = window.firestoreDoc(window.db, 'users', currentUser.uid);
        await window.firestoreSetDoc(docRef, {
            periods: periods,
            currentPeriod: currentPeriod,
            updated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Save failed:', error);
    }
}

async function loadFromCloud() {
    if (!currentUser) return;
    
    try {
        const docRef = window.firestoreDoc(window.db, 'users', currentUser.uid);
        const docSnap = await window.firestoreGetDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            periods = data.periods || {};
            currentPeriod = data.currentPeriod || '';
            save();
            updatePeriodSelect();
            updateUI();
            alert('✅ Data loaded!');
        } else {
            await saveToCloud();
        }
    } catch (error) {
        console.error('Load failed:', error);
    }
}

if (window.onAuthStateChanged && window.auth) {
    window.onAuthStateChanged(window.auth, (user) => {
        currentUser = user;
        if (user) {
            document.getElementById('syncBtn').textContent = '☁️ ' + user.email.split('@')[0];
            loadFromCloud();
        }
    });
}

updatePeriodSelect();
updateUI();
