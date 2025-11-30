let periods = JSON.parse(localStorage.getItem('periods')) || {};
let currentPeriod = localStorage.getItem('currentPeriod') || '';
let darkMode = localStorage.getItem('darkMode') === 'true';
let charts = {};
let currentUser = null;

const transactionsList = document.getElementById('transactionsList');
const searchInput = document.getElementById('searchTransactions');
const filterCategory = document.getElementById('filterCategory');
const periodSelect = document.getElementById('periodSelect');
const periodModal = document.getElementById('periodModal');
const periodName = document.getElementById('periodName');
const loginBtn = document.getElementById('loginBtn');
const userEmail = document.getElementById('userEmail');

// Initialize
if (!currentPeriod && Object.keys(periods).length === 0) {
    const defaultPeriod = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    periods[defaultPeriod] = [];
    currentPeriod = defaultPeriod;
    savePeriods();
}

updatePeriodSelect();

// Dark mode
if (darkMode) document.body.classList.add('dark-mode');

document.getElementById('darkModeToggle').addEventListener('click', () => {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', darkMode);
    document.getElementById('darkModeToggle').textContent = darkMode ? '☀️' : '🌙';
});

// Firebase Authentication
loginBtn.addEventListener('click', async () => {
    if (currentUser) {
        await window.firebaseAuth.signOut();
        loginBtn.textContent = '🔒 Login';
        userEmail.style.display = 'none';
        currentUser = null;
    } else {
        try {
            const provider = new window.GoogleAuthProvider();
            const result = await window.signInWithPopup(window.firebaseAuth, provider);
            currentUser = result.user;
            loginBtn.textContent = '🔓 Logout';
            userEmail.textContent = currentUser.email;
            userEmail.style.display = 'inline';
            await syncWithFirebase();
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    }
});

// Listen for auth state
window.onAuthStateChanged(window.firebaseAuth, async (user) => {
    if (user) {
        currentUser = user;
        loginBtn.textContent = '🔓 Logout';
        userEmail.textContent = user.email;
        userEmail.style.display = 'inline';
        await syncWithFirebase();
    }
});

async function syncWithFirebase() {
    if (!currentUser) return;
    
    const docRef = window.firestoreDoc(window.firebaseDb, 'users', currentUser.uid);
    const docSnap = await window.firestoreGetDoc(docRef);
    
    if (docSnap.exists()) {
        const cloudData = docSnap.data();
        periods = cloudData.periods || {};
        currentPeriod = cloudData.currentPeriod || '';
        localStorage.setItem('periods', JSON.stringify(periods));
        localStorage.setItem('currentPeriod', currentPeriod);
        updatePeriodSelect();
        updateUI();
        alert('✅ Data synced from cloud!');
    } else {
        await saveToFirebase();
        alert('✅ Data uploaded to cloud!');
    }
    
    window.firestoreOnSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const cloudData = doc.data();
            periods = cloudData.periods || {};
            currentPeriod = cloudData.currentPeriod || '';
            localStorage.setItem('periods', JSON.stringify(periods));
            localStorage.setItem('currentPeriod', currentPeriod);
            updatePeriodSelect();
            updateUI();
        }
    });
}

async function saveToFirebase() {
    if (!currentUser) return;
    const docRef = window.firestoreDoc(window.firebaseDb, 'users', currentUser.uid);
    await window.firestoreSetDoc(docRef, {
        periods: periods,
        currentPeriod: currentPeriod,
        lastUpdated: new Date().toISOString()
    });
}

// Period management
let isEditMode = false;
let editingPeriod = '';

document.getElementById('newPeriodBtn').addEventListener('click', () => {
    isEditMode = false;
    document.getElementById('modalTitle').textContent = 'Create New Period';
    document.getElementById('savePeriodBtn').textContent = 'Create';
    periodName.value = '';
    periodModal.style.display = 'block';
    periodName.focus();
});

document.getElementById('editPeriodBtn').addEventListener('click', () => {
    if (!currentPeriod) {
        alert('Please select a period first!');
        return;
    }
    isEditMode = true;
    editingPeriod = currentPeriod;
    document.getElementById('modalTitle').textContent = 'Edit Period Name';
    document.getElementById('savePeriodBtn').textContent = 'Save';
    periodName.value = currentPeriod;
    periodModal.style.display = 'block';
    periodName.focus();
    periodName.select();
});

document.getElementById('deletePeriodBtn').addEventListener('click', () => {
    if (!currentPeriod) {
        alert('Please select a period first!');
        return;
    }
    if (confirm(`Delete period "${currentPeriod}" and all its transactions?`)) {
        delete periods[currentPeriod];
        currentPeriod = Object.keys(periods)[0] || '';
        savePeriods();
        updatePeriodSelect();
        updateUI();
    }
});

document.getElementById('savePeriodBtn').addEventListener('click', savePeriod);
periodName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') savePeriod();
});

document.getElementById('cancelPeriodBtn').addEventListener('click', () => {
    periodModal.style.display = 'none';
    periodName.value = '';
    isEditMode = false;
});

function savePeriod() {
    const name = periodName.value.trim();
    if (!name) return;
    
    if (isEditMode) {
        if (name !== editingPeriod && periods[name]) {
            alert('Period name already exists!');
            return;
        }
        const data = periods[editingPeriod];
        delete periods[editingPeriod];
        periods[name] = data;
        currentPeriod = name;
    } else {
        if (periods[name]) {
            alert('Period already exists!');
            return;
        }
        periods[name] = [];
        currentPeriod = name;
    }
    
    savePeriods();
    updatePeriodSelect();
    periodModal.style.display = 'none';
    periodName.value = '';
    isEditMode = false;
    updateUI();
}

periodSelect.addEventListener('change', (e) => {
    currentPeriod = e.target.value;
    localStorage.setItem('currentPeriod', currentPeriod);
    updateUI();
});

function updatePeriodSelect() {
    periodSelect.innerHTML = '<option value="">Select period...</option>' +
        Object.keys(periods).map(p => 
            `<option value="${p}" ${p === currentPeriod ? 'selected' : ''}>${p}</option>`
        ).join('');
}

function savePeriods() {
    localStorage.setItem('periods', JSON.stringify(periods));
    localStorage.setItem('currentPeriod', currentPeriod);
    if (currentUser) {
        saveToFirebase();
    }
}

function getCurrentTransactions() {
    return periods[currentPeriod] || [];
}

function saveCurrentTransactions(transactions) {
    periods[currentPeriod] = transactions;
    savePeriods();
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Category inputs
document.querySelectorAll('.cat-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTransaction(input);
        }
    });
    
    input.addEventListener('blur', () => {
        addTransaction(input);
    });
});

function addTransaction(input) {
    if (!currentPeriod) {
        alert('Please select or create a period first!');
        return;
    }
    
    const amount = parseFloat(input.value);
    if (amount && amount > 0) {
        const transactions = getCurrentTransactions();
        const transaction = {
            id: Date.now(),
            type: input.dataset.type,
            description: input.dataset.category,
            amount: amount,
            category: input.dataset.category,
            date: new Date().toISOString().split('T')[0],
            recurring: false
        };
        
        transactions.unshift(transaction);
        saveCurrentTransactions(transactions);
        
        input.value = '';
        updateUI();
    }
}

function deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
        const transactions = getCurrentTransactions();
        const filtered = transactions.filter(t => t.id !== id);
        saveCurrentTransactions(filtered);
        updateUI();
    }
}

// Export/Import/Clear
document.getElementById('exportBtn').addEventListener('click', () => {
    const data = { periods, currentPeriod, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
});

function importData() {
    document.getElementById('importFile').click();
}

document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('This will replace all current data. Continue?')) {
                    periods = data.periods || {};
                    currentPeriod = data.currentPeriod || '';
                    savePeriods();
                    updatePeriodSelect();
                    updateUI();
                    alert('Data imported successfully!');
                }
            } catch (error) {
                alert('Invalid file format!');
            }
        };
        reader.readAsText(file);
    }
});

function clearAllData() {
    if (confirm('This will delete ALL periods and transactions. Are you sure?')) {
        if (confirm('Really sure? This cannot be undone!')) {
            periods = {};
            currentPeriod = '';
            localStorage.clear();
            location.reload();
        }
    }
}

searchInput.addEventListener('input', updateUI);
filterCategory.addEventListener('change', updateUI);

function renderCharts() {
    const transactions = getCurrentTransactions();
    Object.values(charts).forEach(chart => chart?.destroy());
    charts = {};
    
    const expensesByCategory = {};
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });
    
    const sortedExpenses = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
    const top5 = sortedExpenses.slice(0, 5);
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    if (sortedExpenses.length > 0 && typeof Chart !== 'undefined') {
        const ctx1 = document.getElementById('expenseChart');
        if (ctx1) {
            charts.expense = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: sortedExpenses.map(([cat]) => cat),
                    datasets: [{ data: sortedExpenses.map(([, amt]) => amt), backgroundColor: colors }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
            });
        }
        
        const ctx2 = document.getElementById('incomeExpenseChart');
        if (ctx2) {
            charts.incomeExpense = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Expenses', 'Balance'],
                    datasets: [{ data: [income, expenses, income - expenses], backgroundColor: ['#10b981', '#ef4444', '#3b82f6'] }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
        
        if (top5.length > 0) {
            const ctx3 = document.getElementById('topExpensesChart');
            if (ctx3) {
                charts.topExpenses = new Chart(ctx3, {
                    type: 'bar',
                    data: {
                        labels: top5.map(([cat]) => cat),
                        datasets: [{ data: top5.map(([, amt]) => amt), backgroundColor: colors.slice(0, 5) }]
                    },
                    options: { responsive: true, maintainAspectRatio: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
                });
            }
        }
    }
    
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;
    const currentSavingsEl = document.getElementById('currentSavings');
    const savingsPercentEl = document.getElementById('savingsPercent');
    if (currentSavingsEl) currentSavingsEl.textContent = `${balance.toFixed(2)} PLN`;
    if (savingsPercentEl) {
        savingsPercentEl.textContent = `${savingsRate.toFixed(1)}%`;
        savingsPercentEl.style.color = savingsRate > 20 ? '#10b981' : savingsRate > 10 ? '#f59e0b' : '#ef4444';
    }
}

function updateUI() {
    if (!currentPeriod) {
        document.getElementById('totalIncome').textContent = '0.00 PLN';
        document.getElementById('totalExpenses').textContent = '0.00 PLN';
        document.getElementById('balance').textContent = '0.00 PLN';
        document.getElementById('savingsRate').textContent = '0%';
        transactionsList.innerHTML = '<p style="color: var(--text-light); padding: 20px 0;">Please select or create a period.</p>';
        updateCategoryTotals();
        return;
    }
    
    const transactions = getCurrentTransactions();
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilter = filterCategory.value;
    
    let filtered = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm) || t.category.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    const income = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;
    
    document.getElementById('totalIncome').textContent = `${income.toFixed(2)} PLN`;
    document.getElementById('totalExpenses').textContent = `${expenses.toFixed(2)} PLN`;
    document.getElementById('balance').textContent = `${balance.toFixed(2)} PLN`;
    document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;
    
    updateCategoryTotals();
    renderCharts();
    
    transactionsList.innerHTML = filtered.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-desc">${t.description}</div>
                <div class="transaction-category">${t.date}</div>
            </div>
            <span class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)} PLN
            </span>
            <button class="delete-btn" onclick="deleteTransaction(${t.id})">Delete</button>
        </div>
    `).join('') || '<p style="color: var(--text-light); padding: 20px 0;">No transactions yet.</p>';
    
    const uniqueCategories = [...new Set(transactions.map(t => t.category))];
    filterCategory.innerHTML = '<option value="all">All Categories</option>' + 
        uniqueCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function updateCategoryTotals() {
    const transactions = getCurrentTransactions();
    const categoryTotals = {};
    transactions.forEach(t => {
        const key = `${t.category}-${t.type}`;
        categoryTotals[key] = (categoryTotals[key] || 0) + t.amount;
    });
    
    document.querySelectorAll('.cat-total').forEach(span => {
        const category = span.dataset.category;
        const type = span.dataset.type;
        const key = `${category}-${type}`;
        const total = categoryTotals[key] || 0;
        span.textContent = `${total.toFixed(2)} PLN`;
        if (total > 0) {
            span.classList.add('has-value');
        } else {
            span.classList.remove('has-value');
        }
    });
}

updateUI();
