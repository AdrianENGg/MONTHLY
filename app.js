let periods = JSON.parse(localStorage.getItem('periods')) || {};
let currentPeriod = localStorage.getItem('currentPeriod') || '';
let darkMode = localStorage.getItem('darkMode') === 'true';

const transactionsList = document.getElementById('transactionsList');
const searchInput = document.getElementById('searchTransactions');
const filterCategory = document.getElementById('filterCategory');
const periodSelect = document.getElementById('periodSelect');
const periodModal = document.getElementById('periodModal');
const periodName = document.getElementById('periodName');

// Initialize
if (!currentPeriod && Object.keys(periods).length === 0) {
    // Create default period
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
        // Edit existing period
        if (name !== editingPeriod && periods[name]) {
            alert('Period name already exists!');
            return;
        }
        const data = periods[editingPeriod];
        delete periods[editingPeriod];
        periods[name] = data;
        currentPeriod = name;
    } else {
        // Create new period
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

// Export data
document.getElementById('exportBtn').addEventListener('click', () => {
    const data = {
        periods,
        currentPeriod,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
});

// Import data
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

// Clear all data
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

// Search and filter
searchInput.addEventListener('input', updateUI);
filterCategory.addEventListener('change', updateUI);

// Update UI
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
        const matchesSearch = t.description.toLowerCase().includes(searchTerm) || 
                            t.category.toLowerCase().includes(searchTerm);
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
    
    // Update category totals
    updateCategoryTotals();
    
    // Update transactions list
    transactionsList.innerHTML = filtered
        .map(t => `
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
        `)
        .join('') || '<p style="color: var(--text-light); padding: 20px 0;">No transactions yet.</p>';
    
    // Update filter dropdowns
    const uniqueCategories = [...new Set(transactions.map(t => t.category))];
    filterCategory.innerHTML = '<option value="all">All Categories</option>' + 
        uniqueCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function updateCategoryTotals() {
    const transactions = getCurrentTransactions();
    
    // Calculate totals per category
    const categoryTotals = {};
    transactions.forEach(t => {
        const key = `${t.category}-${t.type}`;
        categoryTotals[key] = (categoryTotals[key] || 0) + t.amount;
    });
    
    // Update all category total displays
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
