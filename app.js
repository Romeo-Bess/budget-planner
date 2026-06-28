// Supabase Database Configuration
const SUPABASE_URL = 'https://upgrmmymzgystzkffawe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZ3JtbXltemd5c3R6a2ZmYXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzY4ODIsImV4cCI6MjA5ODIxMjg4Mn0.FPAeK5_su8Jf94BBWslR2w590mDRsW3Jolhfh2vdDj0';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const defaultState = {
  assets: 0.00,
  liabilities: 0.00,
  transactions: [],
  budgets: {
    'Groceries': { spent: 0.00, limit: 0.00 },
    'Fuel': { spent: 0.00, limit: 0.00 },
    'Dining': { spent: 0.00, limit: 0.00 },
    'Housing': { spent: 0.00, limit: 0.00 },
    'PersonalCare': { spent: 0.00, limit: 0.00 },
    'Entertainment': { spent: 0.00, limit: 0.00 },
    'Savings': { spent: 0.00, limit: 0.00 }
  },
  goals: []
};

let currentUser = null;
let state = JSON.parse(JSON.stringify(defaultState));

// Dynamic key based on current user session
function getUserStorageKey() {
  return currentUser ? `zar_wealth_dashboard_state_${currentUser.toLowerCase()}` : null;
}

// Load State from Supabase (or LocalStorage fallback) for specified user
async function loadUserState(username) {
  currentUser = username;
  state = JSON.parse(JSON.stringify(defaultState));
  
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('user_budgets_state')
        .select('state_data')
        .eq('username', username)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data && data.state_data) {
        const parsed = data.state_data;
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.assets === 'number') state.assets = parsed.assets;
          if (typeof parsed.liabilities === 'number') state.liabilities = parsed.liabilities;
          if (Array.isArray(parsed.transactions)) state.transactions = parsed.transactions;
          if (Array.isArray(parsed.goals)) state.goals = parsed.goals;
          if (parsed.budgets && typeof parsed.budgets === 'object') {
            Object.keys(state.budgets).forEach(cat => {
              if (parsed.budgets[cat]) {
                state.budgets[cat] = {
                  spent: typeof parsed.budgets[cat].spent === 'number' ? parsed.budgets[cat].spent : 0,
                  limit: typeof parsed.budgets[cat].limit === 'number' ? parsed.budgets[cat].limit : 0
                };
              }
            });
          }
        }
      } else {
        // No remote row found yet, create one
        await saveStateToDB();
      }
    } catch (e) {
      console.warn('Failed to load user state from Supabase database, falling back to LocalStorage.', e);
      loadFromLocalStorage();
    }
  } else {
    loadFromLocalStorage();
  }
  
  // Update Profile details in sidebar
  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-display-role');
  
  if (nameEl) nameEl.textContent = username;
  if (roleEl) roleEl.textContent = username === 'Romeo' ? 'Budget Manager' : 'Savings Expert';
  if (avatarEl) {
    avatarEl.textContent = username.charAt(0).toUpperCase();
  }
  
  updateDashboardUI();
}

function loadFromLocalStorage() {
  try {
    const savedState = localStorage.getItem(getUserStorageKey());
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.assets === 'number') state.assets = parsed.assets;
        if (typeof parsed.liabilities === 'number') state.liabilities = parsed.liabilities;
        if (Array.isArray(parsed.transactions)) state.transactions = parsed.transactions;
        if (Array.isArray(parsed.goals)) state.goals = parsed.goals;
        if (parsed.budgets && typeof parsed.budgets === 'object') {
          Object.keys(state.budgets).forEach(cat => {
            if (parsed.budgets[cat]) {
              state.budgets[cat] = {
                spent: typeof parsed.budgets[cat].spent === 'number' ? parsed.budgets[cat].spent : 0,
                limit: typeof parsed.budgets[cat].limit === 'number' ? parsed.budgets[cat].limit : 0
              };
            }
          });
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load user state from browser LocalStorage.', e);
  }
}

// Save State to Supabase Database (with LocalStorage cache)
async function saveStateToDB() {
  const key = getUserStorageKey();
  if (!key) return;
  
  // Local cache
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }

  // Supabase sync
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient
        .from('user_budgets_state')
        .upsert({
          username: currentUser,
          state_data: state,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (e) {
      console.error('Failed to write state changes to Supabase database.', e);
    }
  }
}

// ZAR Formatting Utility (Format: "R 1 234,56")
function formatZAR(val) {
  const isNegative = val < 0;
  const absoluteVal = Math.abs(val);
  const fixed = absoluteVal.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');
  
  // Format thousands with space
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return `${isNegative ? '-' : ''}R ${formattedInteger},${decimalPart}`;
}

// DOM Elements
const netWorthEl = document.getElementById('net-worth-amount');
const assetsEl = document.getElementById('total-assets');
const liabilitiesEl = document.getElementById('total-liabilities');
const transactionListEl = document.getElementById('transaction-list-element');

// Quick Add Form Elements (Inside Modal)
const quickAddModal = document.getElementById('quick-add-modal');
const btnTriggerLogTx = document.getElementById('btn-trigger-log-tx');
const mobileTriggerLogTx = document.getElementById('mobile-trigger-log-tx');
const closeQuickAddBtn = document.getElementById('close-quick-add-btn');
const quickAddForm = document.getElementById('quick-add-form');
const descInput = document.getElementById('entry-description');
const amountInput = document.getElementById('entry-amount');
const typeSelect = document.getElementById('entry-type');
const categorySelect = document.getElementById('entry-category');
const descError = document.getElementById('desc-error');
const amountError = document.getElementById('amount-error');

// Custom Autocomplete Suggestions Dropdown Logic
const descSuggestionsDropdown = document.getElementById('description-suggestions-dropdown');
const descriptionSuggestions = [
  "Woolworths",
  "Checkers",
  "Pick n Pay",
  "Spar",
  "Fuel",
  "Uber Ride",
  "Uber Eats",
  "Restaurant Dine-out",
  "Rent",
  "Electricity Bill",
  "Water (Utilities)",
  "Hair Salon",
  "Barber Shop",
  "Pharmacy / Meds",
  "Cosmetics & Makeup",
  "Netflix Subscription",
  "Apple subscription",
  "Cinema Tickets",
  "Salary Deposit",
  "Side Hustle Income",
  "Investment Contribution"
];

function showSuggestions(filterText = '') {
  if (!descSuggestionsDropdown) return;
  const filtered = descriptionSuggestions.filter(item => 
    item.toLowerCase().includes(filterText.toLowerCase())
  );
  
  descSuggestionsDropdown.innerHTML = '';
  
  if (filtered.length === 0) {
    descSuggestionsDropdown.style.display = 'none';
    return;
  }
  
  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = item;
    div.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent document click handler from firing
      descInput.value = item;
      descSuggestionsDropdown.style.display = 'none';
      
      // Auto-detect type and category for ease of logging
      const textLower = item.toLowerCase();
      if (textLower === 'salary deposit' || textLower === 'side hustle income') {
        typeSelect.value = 'income';
        categorySelect.value = 'Savings';
      } else {
        typeSelect.value = 'expense';
        if (textLower.includes('woolworths') || textLower.includes('checkers') || textLower.includes('pick n pay') || textLower.includes('spar')) {
          categorySelect.value = 'Groceries';
        } else if (textLower.includes('fuel')) {
          categorySelect.value = 'Fuel';
        } else if (textLower.includes('dine') || textLower.includes('restaurant') || textLower.includes('uber eats')) {
          categorySelect.value = 'Dining';
        } else if (textLower.includes('rent') || textLower.includes('electricity') || textLower.includes('water')) {
          categorySelect.value = 'Housing';
        } else if (textLower.includes('salon') || textLower.includes('barber') || textLower.includes('pharmacy') || textLower.includes('meds') || textLower.includes('cosmetics') || textLower.includes('makeup')) {
          categorySelect.value = 'PersonalCare';
        } else if (textLower.includes('netflix') || textLower.includes('apple') || textLower.includes('cinema')) {
          categorySelect.value = 'Entertainment';
        } else if (textLower.includes('investment') || textLower.includes('savings')) {
          categorySelect.value = 'Savings';
        }
      }
    });
    descSuggestionsDropdown.appendChild(div);
  });
  
  descSuggestionsDropdown.style.display = 'block';
}

if (descInput) {
  descInput.addEventListener('focus', () => {
    showSuggestions(descInput.value);
  });
  
  descInput.addEventListener('input', () => {
    showSuggestions(descInput.value);
  });
}

// Click outside or in open space to close dropdown
document.addEventListener('click', (e) => {
  if (descSuggestionsDropdown && descInput) {
    if (e.target !== descInput && !descSuggestionsDropdown.contains(e.target)) {
      descSuggestionsDropdown.style.display = 'none';
    }
  }
});


// Filter Elements
const filterSearch = document.getElementById('filter-search');
const filterCategory = document.getElementById('filter-category');
const filterType = document.getElementById('filter-type');

// Edit Balances Modal Elements
const editBalancesModal = document.getElementById('edit-balances-modal');
const btnEditBalances = document.getElementById('btn-edit-balances');
const mobileTriggerEditBal = document.getElementById('mobile-trigger-edit-bal');
const closeModalBtn = document.getElementById('close-modal-btn');
const editBalancesForm = document.getElementById('edit-balances-form');
const editAssetsInput = document.getElementById('edit-assets');
const editLiabilitiesInput = document.getElementById('edit-liabilities');
const assetsError = document.getElementById('assets-error');
const liabilitiesError = document.getElementById('liabilities-error');

// Edit Budgets Modal Elements
const editBudgetsModal = document.getElementById('edit-budgets-modal');
const btnEditBudgets = document.getElementById('btn-edit-budgets');
const closeBudgetsModalBtn = document.getElementById('close-budgets-modal-btn');
const editBudgetsForm = document.getElementById('edit-budgets-form');
const limitGroceriesInput = document.getElementById('limit-groceries');
const limitFuelInput = document.getElementById('limit-fuel');
const limitDiningInput = document.getElementById('limit-dining');
const limitHousingInput = document.getElementById('limit-housing');
const limitPersonalCareInput = document.getElementById('limit-personalcare');
const limitEntertainmentInput = document.getElementById('limit-entertainment');
const limitSavingsInput = document.getElementById('limit-savings');

// Create Goal Modal Elements
const createGoalModal = document.getElementById('create-goal-modal');
const btnCreateGoal = document.getElementById('btn-create-goal');
const closeGoalModalBtn = document.getElementById('close-goal-modal-btn');
const createGoalForm = document.getElementById('create-goal-form');
const goalNameInput = document.getElementById('goal-name');
const goalTypeSelect = document.getElementById('goal-type');
const goalTargetInput = document.getElementById('goal-target');
const goalCurrentInput = document.getElementById('goal-current');
const goalNameError = document.getElementById('goal-name-error');
const goalTargetError = document.getElementById('goal-target-error');
const goalCurrentError = document.getElementById('goal-current-error');
const goalsListContainer = document.getElementById('goals-list-container');

// Contribute Modal Elements
const contributeGoalModal = document.getElementById('contribute-goal-modal');
const closeContribModalBtn = document.getElementById('close-contrib-modal-btn');
const contributeGoalForm = document.getElementById('contribute-goal-form');
const contribGoalIdInput = document.getElementById('contrib-goal-id');
const contribGoalNameText = document.getElementById('contrib-goal-name');
const contribAmountInput = document.getElementById('contrib-amount');
const contribError = document.getElementById('contrib-error');

// Snowball Simulator Elements
const snowballExtraInput = document.getElementById('snowball-extra-payment');
const snowballResultContainer = document.getElementById('snowball-result-container');

// Tab Routing Implementation
const tabLinks = document.querySelectorAll('[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

tabLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tabTarget = link.getAttribute('data-tab');
    
    // Update active class on links (syncing mobile & desktop)
    tabLinks.forEach(l => {
      l.classList.remove('active');
      l.removeAttribute('aria-current');
    });
    
    const matchingLinks = document.querySelectorAll(`[data-tab="${tabTarget}"]`);
    matchingLinks.forEach(l => {
      l.classList.add('active');
      l.setAttribute('aria-current', 'page');
    });
    
    // Toggle active classes on tab content views
    tabContents.forEach(content => {
      content.classList.remove('active-view');
    });
    
    const targetContent = document.getElementById(`tab-${tabTarget}`);
    if (targetContent) {
      targetContent.classList.add('active-view');
    }
  });
});

// Mobile helper to scroll to form if needed
const mobileToggleAdd = document.getElementById('mobile-toggle-add');
const quickAddSection = document.getElementById('quick-add-section');

if (mobileToggleAdd && quickAddSection) {
  mobileToggleAdd.addEventListener('click', () => {
    const overviewTabLink = document.querySelector('[data-tab="overview"]');
    if (overviewTabLink) overviewTabLink.click();
    setTimeout(() => {
      quickAddSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });
}

// Modal Toggle Logic Helper
function toggleModal(modal, show) {
  if (show) {
    modal.classList.add('open');
  } else {
    modal.classList.remove('open');
  }
}

// 1. Transaction Modal triggers
function openTransactionModal() {
  descInput.value = '';
  amountInput.value = '';
  descInput.classList.remove('invalid');
  amountInput.classList.remove('invalid');
  descError.textContent = '';
  amountError.textContent = '';
  toggleModal(quickAddModal, true);
}
if (btnTriggerLogTx) btnTriggerLogTx.addEventListener('click', openTransactionModal);
if (mobileTriggerLogTx) mobileTriggerLogTx.addEventListener('click', openTransactionModal);
if (closeQuickAddBtn) closeQuickAddBtn.addEventListener('click', () => toggleModal(quickAddModal, false));
quickAddModal.addEventListener('click', (e) => {
  if (e.target === quickAddModal) toggleModal(quickAddModal, false);
});

// 2. Edit Balances Modal Triggers
if (btnEditBalances) btnEditBalances.addEventListener('click', () => {
  editAssetsInput.value = state.assets;
  editLiabilitiesInput.value = state.liabilities;
  assetsError.textContent = '';
  liabilitiesError.textContent = '';
  editAssetsInput.classList.remove('invalid');
  editLiabilitiesInput.classList.remove('invalid');
  toggleModal(editBalancesModal, true);
});
if (mobileTriggerEditBal) mobileTriggerEditBal.addEventListener('click', () => {
  editAssetsInput.value = state.assets;
  editLiabilitiesInput.value = state.liabilities;
  toggleModal(editBalancesModal, true);
});
if (closeModalBtn) closeModalBtn.addEventListener('click', () => toggleModal(editBalancesModal, false));
editBalancesModal.addEventListener('click', (e) => {
  if (e.target === editBalancesModal) toggleModal(editBalancesModal, false);
});

editBalancesForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newAssetsVal = parseFloat(editAssetsInput.value);
  const newLiabilitiesVal = parseFloat(editLiabilitiesInput.value);
  let isValid = true;
  
  if (isNaN(newAssetsVal) || newAssetsVal < 0) {
    editAssetsInput.classList.add('invalid');
    assetsError.textContent = 'Please enter a valid amount.';
    isValid = false;
  }
  if (isNaN(newLiabilitiesVal) || newLiabilitiesVal < 0) {
    editLiabilitiesInput.classList.add('invalid');
    liabilitiesError.textContent = 'Please enter a valid amount.';
    isValid = false;
  }
  
  if (!isValid) return;
  state.assets = newAssetsVal;
  state.liabilities = newLiabilitiesVal;
  saveStateToDB();
  toggleModal(editBalancesModal, false);
  updateDashboardUI();
});

// 3. Edit Budgets Modal Triggers
if (btnEditBudgets) btnEditBudgets.addEventListener('click', () => {
  limitGroceriesInput.value = state.budgets['Groceries'].limit;
  limitFuelInput.value = state.budgets['Fuel'].limit;
  limitDiningInput.value = state.budgets['Dining'].limit;
  limitHousingInput.value = state.budgets['Housing'].limit;
  limitPersonalCareInput.value = state.budgets['PersonalCare'].limit;
  limitEntertainmentInput.value = state.budgets['Entertainment'].limit;
  limitSavingsInput.value = state.budgets['Savings'].limit;
  toggleModal(editBudgetsModal, true);
});
if (closeBudgetsModalBtn) closeBudgetsModalBtn.addEventListener('click', () => toggleModal(editBudgetsModal, false));
editBudgetsModal.addEventListener('click', (e) => {
  if (e.target === editBudgetsModal) toggleModal(editBudgetsModal, false);
});

editBudgetsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.budgets['Groceries'].limit = parseFloat(limitGroceriesInput.value) || 0;
  state.budgets['Fuel'].limit = parseFloat(limitFuelInput.value) || 0;
  state.budgets['Dining'].limit = parseFloat(limitDiningInput.value) || 0;
  state.budgets['Housing'].limit = parseFloat(limitHousingInput.value) || 0;
  state.budgets['PersonalCare'].limit = parseFloat(limitPersonalCareInput.value) || 0;
  state.budgets['Entertainment'].limit = parseFloat(limitEntertainmentInput.value) || 0;
  state.budgets['Savings'].limit = parseFloat(limitSavingsInput.value) || 0;
  
  saveStateToDB();
  toggleModal(editBudgetsModal, false);
  updateDashboardUI();
});

// 4. Goals Modal Triggers
if (btnCreateGoal) btnCreateGoal.addEventListener('click', () => {
  goalNameInput.value = '';
  goalTargetInput.value = '';
  goalCurrentInput.value = '0';
  goalNameError.textContent = '';
  goalTargetError.textContent = '';
  goalCurrentError.textContent = '';
  toggleModal(createGoalModal, true);
});
if (closeGoalModalBtn) closeGoalModalBtn.addEventListener('click', () => toggleModal(createGoalModal, false));
createGoalModal.addEventListener('click', (e) => {
  if (e.target === createGoalModal) toggleModal(createGoalModal, false);
});

createGoalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  goalNameInput.classList.remove('invalid');
  goalTargetInput.classList.remove('invalid');
  goalCurrentInput.classList.remove('invalid');
  goalNameError.textContent = '';
  goalTargetError.textContent = '';
  goalCurrentError.textContent = '';
  
  const name = goalNameInput.value.trim();
  const type = goalTypeSelect.value;
  const target = parseFloat(goalTargetInput.value);
  const current = parseFloat(goalCurrentInput.value);
  
  let isValid = true;
  if (!name || name.length < 2) {
    goalNameInput.classList.add('invalid');
    goalNameError.textContent = 'Please enter a goal title.';
    isValid = false;
  }
  if (isNaN(target) || target <= 0) {
    goalTargetInput.classList.add('invalid');
    goalTargetError.textContent = 'Please enter a target amount greater than 0.';
    isValid = false;
  }
  if (isNaN(current) || current < 0 || current > target) {
    goalCurrentInput.classList.add('invalid');
    goalCurrentError.textContent = 'Current amount must be between 0 and target.';
    isValid = false;
  }
  
  if (!isValid) return;
  
  const newGoal = {
    id: Date.now(),
    name: name,
    type: type,
    target: target,
    current: current
  };
  
  state.goals.push(newGoal);
  saveStateToDB();
  toggleModal(createGoalModal, false);
  updateDashboardUI();
});

// 5. Contribute Modal Triggers
if (closeContribModalBtn) closeContribModalBtn.addEventListener('click', () => toggleModal(contributeGoalModal, false));
contributeGoalModal.addEventListener('click', (e) => {
  if (e.target === contributeGoalModal) toggleModal(contributeGoalModal, false);
});

contributeGoalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  contribAmountInput.classList.remove('invalid');
  contribError.textContent = '';
  
  const amount = parseFloat(contribAmountInput.value);
  const goalId = parseInt(contribGoalIdInput.value);
  const goal = state.goals.find(g => g.id === goalId);
  
  if (isNaN(amount) || amount <= 0) {
    contribAmountInput.classList.add('invalid');
    contribError.textContent = 'Please enter a valid amount.';
    return;
  }
  
  if (goal) {
    const maxRemaining = goal.target - goal.current;
    if (amount > maxRemaining) {
      contribAmountInput.classList.add('invalid');
      contribError.textContent = `Amount exceeds target remaining balance of ${formatZAR(maxRemaining)}.`;
      return;
    }
    
    // Add to goal balance
    goal.current += amount;
    
    // Record Contribution in State Finances
    if (goal.type === 'savings') {
      state.assets += amount;
      state.budgets['Savings'].spent += amount;
    } else {
      state.liabilities = Math.max(0, state.liabilities - amount);
    }
    
    // Log in transactions list
    state.transactions.push({
      id: Date.now(),
      description: `Goal Payoff: ${goal.name}`,
      amount: amount,
      type: goal.type === 'savings' ? 'income' : 'expense',
      category: 'Savings'
    });
    
    contribAmountInput.value = '';
    saveStateToDB();
    toggleModal(contributeGoalModal, false);
    updateDashboardUI();
  }
});

function openContributeModal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (goal) {
    contribGoalIdInput.value = goal.id;
    contribGoalNameText.textContent = goal.name;
    contribAmountInput.value = '';
    contribError.textContent = '';
    contribAmountInput.classList.remove('invalid');
    toggleModal(contributeGoalModal, true);
  }
}

// 6. Transaction Filter Listeners
const triggerFilter = () => {
  const query = (filterSearch.value || '').toLowerCase().trim();
  const selectedCat = filterCategory.value || 'all';
  const selectedType = filterType.value || 'all';

  const filteredList = state.transactions.filter(tx => {
    const matchQuery = tx.description.toLowerCase().includes(query);
    const matchCat = selectedCat === 'all' || tx.category === selectedCat;
    const matchType = selectedType === 'all' || tx.type === selectedType;
    return matchQuery && matchCat && matchType;
  });

  renderTransactionsList(filteredList);
};

if (filterSearch) filterSearch.addEventListener('input', triggerFilter);
if (filterCategory) filterCategory.addEventListener('change', triggerFilter);
if (filterType) filterType.addEventListener('change', triggerFilter);

function renderTransactionsList(list) {
  transactionListEl.innerHTML = '';
  
  if (list.length === 0) {
    transactionListEl.innerHTML = '<li style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No matching transactions found.</li>';
    return;
  }

  list.slice().reverse().forEach(tx => {
    const li = document.createElement('li');
    li.className = 'transaction-row';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'tx-info';
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'tx-title';
    titleSpan.textContent = tx.description;
    
    const catSpan = document.createElement('span');
    catSpan.className = 'tx-category';
    catSpan.textContent = tx.category;
    
    infoDiv.appendChild(titleSpan);
    infoDiv.appendChild(catSpan);
    
    const amtSpan = document.createElement('span');
    amtSpan.className = `tx-amount ${tx.type === 'income' ? 'positive' : 'negative'}`;
    amtSpan.textContent = `${tx.type === 'income' ? '+' : '-'}${formatZAR(tx.amount)}`;
    
    li.appendChild(infoDiv);
    li.appendChild(amtSpan);
    transactionListEl.appendChild(li);
  });
}

// Dynamic SVG Spend Donut Chart Drawer
function drawSpendChart() {
  const chartEl = document.getElementById('spend-donut-chart');
  const chartTotalEl = document.getElementById('chart-total-spent');
  const legendContainer = document.getElementById('chart-legend-container');
  
  if (!chartEl || !chartTotalEl || !legendContainer) return;
  
  const expenseCategories = ['Groceries', 'Fuel', 'Dining', 'Housing', 'PersonalCare', 'Entertainment'];
  const categoryColors = {
    'Groceries': '#006b60',
    'Fuel': '#71d8c8',
    'Dining': '#E06C75',
    'Housing': '#0d9488',
    'PersonalCare': '#822430',
    'Entertainment': '#f59e0b'
  };
  const categoryNames = {
    'Groceries': 'Groceries',
    'Fuel': 'Fuel & Transport',
    'Dining': 'Dining Out',
    'Housing': 'Housing & Utilities',
    'PersonalCare': 'Personal Care',
    'Entertainment': 'Entertainment & Leisure'
  };
  
  let totalSpent = 0;
  expenseCategories.forEach(cat => {
    totalSpent += state.budgets[cat].spent;
  });
  
  chartTotalEl.textContent = formatZAR(totalSpent);
  chartEl.innerHTML = '';
  legendContainer.innerHTML = '';
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // 251.32
  
  if (totalSpent === 0) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', '#e2e8f0');
    circle.setAttribute('stroke-width', '8');
    chartEl.appendChild(circle);
  } else {
    let cumulativeOffset = 0;
    
    expenseCategories.forEach(cat => {
      const spent = state.budgets[cat].spent;
      if (spent > 0) {
        const percentage = spent / totalSpent;
        const color = categoryColors[cat];
        const dashArray = `${percentage * circumference} ${circumference}`;
        const dashOffset = -cumulativeOffset;
        cumulativeOffset += percentage * circumference;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', radius.toString());
        circle.setAttribute('fill', 'transparent');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '8');
        circle.setAttribute('stroke-dasharray', dashArray);
        circle.setAttribute('stroke-dashoffset', dashOffset.toString());
        
        circle.style.transition = 'stroke-width 0.2s ease, stroke-dashoffset 0.6s ease';
        circle.addEventListener('mouseenter', () => circle.setAttribute('stroke-width', '10'));
        circle.addEventListener('mouseleave', () => circle.setAttribute('stroke-width', '8'));
        
        chartEl.appendChild(circle);
      }
    });
  }
  
  // Render Legend
  expenseCategories.forEach(cat => {
    const spent = state.budgets[cat].spent;
    const color = categoryColors[cat];
    const percentage = totalSpent > 0 ? ((spent / totalSpent) * 100).toFixed(1) : '0.0';
    
    const pill = document.createElement('div');
    pill.style.display = 'flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '0.5rem';
    pill.style.padding = '0.4rem 0.8rem';
    pill.style.background = '#ffffff';
    pill.style.borderRadius = '2rem';
    pill.style.border = '1px solid var(--glass-border)';
    pill.style.fontSize = '0.85rem';
    pill.style.fontWeight = '600';
    
    pill.innerHTML = `
      <span style="width: 0.65rem; height: 0.65rem; background-color: ${color}; border-radius: 50%; display: inline-block;"></span>
      <span style="color: var(--color-text);">${categoryNames[cat]}</span>
      <span style="color: var(--color-text-muted); font-size: 0.75rem;">(${percentage}%)</span>
      <span style="margin-left: 0.25rem; color: var(--color-teal);">${formatZAR(spent)}</span>
    `;
    
    legendContainer.appendChild(pill);
  });
  
}

// Dave Ramsey Dynamic Advisor Tips Generator
function renderRamseyTips() {
  const container = document.getElementById('ramsey-tips-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  const emergencyGoal = state.goals.find(g => g.name.toLowerCase().includes('emergency'));
  const emergencyBalance = emergencyGoal ? emergencyGoal.current : 0;
  const activeDebts = state.goals.filter(g => g.type === 'debt' && (g.target - g.current) > 0);
  const totalRemainingDebt = activeDebts.reduce((sum, g) => sum + (g.target - g.current), 0);
  
  let currentBabyStep = 1;
  let stepTitle = "Baby Step 1: Save R 20,000 Starter Emergency Fund";
  let stepDescription = "Build a R 20,000 beginner fund as fast as possible to protect yourself from life's unexpected events. Focus on this before paying down debt aggressively.";
  let stepStatusColor = "var(--color-warning)";
  let stepBg = "rgba(245, 158, 11, 0.05)";
  let stepBorder = "rgba(245, 158, 11, 0.15)";
  
  if (emergencyBalance >= 20000) {
    if (activeDebts.length > 0 || state.liabilities > 0) {
      currentBabyStep = 2;
      stepTitle = "Baby Step 2: Pay Off All Debt Using the Debt Snowball";
      stepDescription = "List your debts from smallest to largest. Pay the minimums on all, and aggressively pay off the smallest first.";
      stepStatusColor = "var(--color-expense)";
      stepBg = "rgba(225, 29, 72, 0.05)";
      stepBorder = "rgba(225, 29, 72, 0.15)";
    } else if (emergencyGoal && emergencyGoal.current < emergencyGoal.target) {
      currentBabyStep = 3;
      stepTitle = "Baby Step 3: Fully Funded Emergency Fund (3-6 Months)";
      stepDescription = "Stack 3 to 6 months of expenses in a secure savings account. Total target: " + formatZAR(emergencyGoal.target);
      stepStatusColor = "var(--color-growth)";
      stepBg = "rgba(13, 148, 136, 0.05)";
      stepBorder = "rgba(13, 148, 136, 0.15)";
    } else {
      currentBabyStep = 4; // Baby Step 4, 5, 6
      stepTitle = "Baby Step 4+: Invest 15%, Fund College, Pay Off House";
      stepDescription = "You are debt-free with a full emergency fund! Shift focus to building long-term wealth, investing, and paying off home loans early.";
      stepStatusColor = "var(--color-growth)";
      stepBg = "rgba(13, 148, 136, 0.05)";
      stepBorder = "rgba(13, 148, 136, 0.15)";
    }
  }

  // Inject current Baby Step Overview Card
  const stepOverviewBlock = document.createElement('div');
  stepOverviewBlock.style.padding = '1.5rem';
  stepOverviewBlock.style.borderRadius = '1rem';
  stepOverviewBlock.style.background = stepBg;
  stepOverviewBlock.style.border = `1.5px solid ${stepBorder}`;
  stepOverviewBlock.style.marginBottom = '1rem';
  stepOverviewBlock.style.display = 'flex';
  stepOverviewBlock.style.flexDirection = 'column';
  stepOverviewBlock.style.gap = '0.5rem';
  
  stepOverviewBlock.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
      <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${stepStatusColor};">Active Milestone</span>
      <span class="budget-status" style="background-color: ${stepBorder}; color: ${stepStatusColor}; font-weight: 800;">BS ${currentBabyStep}</span>
    </div>
    <h3 style="font-weight: 800; font-size: 1.2rem; color: var(--color-brand);">${stepTitle}</h3>
    <p style="font-size: 0.95rem; color: var(--color-text-muted); line-height: 1.5;">${stepDescription}</p>
  `;
  container.appendChild(stepOverviewBlock);

  // Recommendations and Action items
  const tips = [];
  
  // BS1 Specific Guidance
  if (currentBabyStep === 1) {
    const currentSaved = emergencyGoal ? emergencyGoal.current : 0;
    const remainingTo20k = 20000 - currentSaved;
    tips.push({
      title: 'Action Item: Secure your R 20,000 Starter Fund',
      content: `You need R ${remainingTo20k.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} more to complete Baby Step 1. Stop all investing, extra debt payments, and non-essential spend immediately until this buffer is funded. Sell unused items or take on a side hustle if needed to get this done in 30 days!`,
      level: 'warning'
    });
  }

  // BS2 Specific Guidance
  if (currentBabyStep === 2) {
    tips.push({
      title: 'Action Item: Attack your Debt Snowball',
      content: `You have ${activeDebts.length} active debts totaling ${formatZAR(totalRemainingDebt)}. Make sure you are paying the minimums on all of them, and redirect every spare Rand to the smallest debt: "${sortedDebtsList()[0]?.name || 'Smallest Debt'}". The goal here is fast wins to build psychological momentum!`,
      level: 'danger'
    });
  }

  // Budget leak analysis
  const leaks = [];
  Object.keys(state.budgets).forEach(cat => {
    const budget = state.budgets[cat];
    const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
    if (percentage > 100) {
      const overAmount = budget.spent - budget.limit;
      leaks.push(`<strong>${cat}</strong> is over budget by <strong>${formatZAR(overAmount)}</strong> (${percentage.toFixed(0)}% used)`);
    } else if (percentage >= 85) {
      const remaining = budget.limit - budget.spent;
      leaks.push(`<strong>${cat}</strong> is dangerously close to its limit with only <strong>${formatZAR(remaining)}</strong> remaining (${percentage.toFixed(0)}% used)`);
    }
  });

  if (leaks.length > 0) {
    tips.push({
      title: 'Leak Alerts: Areas to Improve',
      content: `Your active spending patterns show budget leaks that are slowing down your progress:
      <ul style="margin-top: 0.5rem; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem;">
        ${leaks.map(leak => `<li>${leak}</li>`).join('')}
      </ul>
      <p style="margin-top: 0.5rem; font-size: 0.9rem;">Dave's advice: Cut back immediately. Live on beans and rice, stop dining out, and re-allocate those funds to speed up your Baby Step goals!</p>`,
      level: 'danger'
    });
  } else {
    tips.push({
      title: 'Budget Health: Clean Spending',
      content: `Superb job! All of your category budgets are well under control and on track. By staying disciplined and avoiding budget leaks, you're maximizing the cash flow available to fund your goals.`,
      level: 'good'
    });
  }

  // Helper function to list sorted debts
  function sortedDebtsList() {
    return state.goals
      .filter(g => g.type === 'debt')
      .map(g => ({ ...g, remaining: Math.max(0, g.target - g.current) }))
      .filter(g => g.remaining > 0)
      .sort((a, b) => a.remaining - b.remaining);
  }

  // Render secondary advice blocks
  tips.forEach(tip => {
    const block = document.createElement('div');
    let bg = 'rgba(13, 148, 136, 0.03)';
    let border = 'rgba(13, 148, 136, 0.1)';
    let titleColor = 'var(--color-growth)';
    
    if (tip.level === 'warning') {
      bg = 'rgba(245, 158, 11, 0.03)';
      border = 'rgba(245, 158, 11, 0.1)';
      titleColor = 'var(--color-warning)';
    } else if (tip.level === 'danger') {
      bg = 'rgba(225, 29, 72, 0.03)';
      border = 'rgba(225, 29, 72, 0.1)';
      titleColor = 'var(--color-expense)';
    }
    
    block.style.padding = '1.25rem';
    block.style.borderRadius = '0.75rem';
    block.style.background = bg;
    block.style.border = `1px solid ${border}`;
    block.style.display = 'flex';
    block.style.flexDirection = 'column';
    block.style.gap = '0.35rem';
    
    block.innerHTML = `
      <h4 style="font-weight: 700; color: ${titleColor}; font-size: 0.95rem;">${tip.title}</h4>
      <div style="font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.5;">${tip.content}</div>
    `;
    container.appendChild(block);
  });
}

// Debt Snowball Projection Algorithm
function renderDebtSnowball() {
  if (!snowballResultContainer) return;
  
  const extraVal = parseFloat(snowballExtraInput.value) || 0;
  const debts = state.goals.filter(g => g.type === 'debt');
  
  snowballResultContainer.innerHTML = '';
  
  if (debts.length === 0) {
    snowballResultContainer.innerHTML = `
      <div style="padding: 1.25rem; border-radius: 0.75rem; background: rgba(13, 148, 136, 0.05); border: 1px solid rgba(13, 148, 136, 0.15);">
        <p style="font-size: 0.95rem; font-weight: 600; color: var(--color-teal); text-align: center;">
          🎉 Congratulations! You have no active debts recorded. Focus on Baby Step 3 (fully funding your Emergency Fund)!
        </p>
      </div>
    `;
    return;
  }
  
  // Sort debts smallest remaining balance to largest (Dave Ramsey Snowball)
  const sortedDebts = debts.map(g => {
    const remaining = Math.max(0, g.target - g.current);
    return { ...g, remaining };
  }).sort((a, b) => a.remaining - b.remaining);
  
  const table = document.createElement('div');
  table.style.display = 'flex';
  table.style.flexDirection = 'column';
  table.style.gap = '0.75rem';
  table.style.width = '100%';
  
  let currentExtraPool = extraVal;
  const baseMinPayment = 500; // Assume default R500 minimum payment per debt
  let totalMonthsAccumulated = 0;
  
  sortedDebts.forEach((debt, index) => {
    const monthlyRate = currentExtraPool + baseMinPayment;
    const monthsToPayoff = monthlyRate > 0 ? Math.ceil(debt.remaining / monthlyRate) : Infinity;
    totalMonthsAccumulated += monthsToPayoff === Infinity ? 0 : monthsToPayoff;
    
    // Roll the base payment into the snowball pool for the next debt
    currentExtraPool += baseMinPayment;
    
    const row = document.createElement('div');
    row.className = 'budget-item';
    row.style.background = '#ffffff';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '1.25rem';
    
    row.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <span style="font-weight: 700; font-size: 0.95rem; color: var(--color-brand);">${index + 1}. ${debt.name}</span>
        <span style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: 500;">
          Remaining Balance: ${formatZAR(debt.remaining)} | Total Snowball Allocation: ${formatZAR(monthlyRate)}/mo
        </span>
      </div>
      <div style="text-align: right;">
        <span class="budget-status ${debt.remaining === 0 ? 'status-good' : 'status-danger'}" style="font-size: 0.75rem;">
          ${debt.remaining === 0 ? 'PAID OFF' : `Payoff in ~${monthsToPayoff} months`}
        </span>
      </div>
    `;
    table.appendChild(row);
  });
  
  snowballResultContainer.appendChild(table);
  
  // Total projection summary
  const summaryBlock = document.createElement('div');
  summaryBlock.style.padding = '1rem';
  summaryBlock.style.background = 'rgba(15, 23, 42, 0.03)';
  summaryBlock.style.border = '1px solid var(--glass-border)';
  summaryBlock.style.borderRadius = '0.75rem';
  summaryBlock.style.fontSize = '0.9rem';
  summaryBlock.style.fontWeight = '600';
  summaryBlock.style.textAlign = 'center';
  summaryBlock.innerHTML = `Estimated Total Payoff Time: <span style="color: var(--color-teal); font-weight: 800;">${totalMonthsAccumulated} Months</span> using the Debt Snowball strategy.`;
  
  snowballResultContainer.appendChild(summaryBlock);
}

if (snowballExtraInput) {
  snowballExtraInput.addEventListener('input', renderDebtSnowball);
}

// Render functions
function updateDashboardUI() {
  const netWorth = state.assets - state.liabilities;
  netWorthEl.textContent = formatZAR(netWorth).replace('R ', ''); // Keep format consistent without duplicate R symbol
  assetsEl.textContent = formatZAR(state.assets);
  liabilitiesEl.textContent = formatZAR(state.liabilities);
  
  // Update budget progress bars
  Object.keys(state.budgets).forEach(category => {
    const budget = state.budgets[category];
    const budgetItems = document.querySelectorAll(`.budget-item[data-category="${category}"]`);
    
    budgetItems.forEach(budgetItem => {
      const percentage = budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
      const spentValEl = budgetItem.querySelector('.spent-value');
      const limitValEl = budgetItem.querySelector('.limit-value');
      const progressBar = budgetItem.querySelector('.progress-bar');
      const statusLabel = budgetItem.querySelector('.budget-status');
      
      if (spentValEl) spentValEl.textContent = `Spent: ${formatZAR(budget.spent)}`;
      if (limitValEl) limitValEl.textContent = `Limit: ${formatZAR(budget.limit)}`;
      if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        
        progressBar.classList.remove('bar-healthy', 'bar-warning', 'bar-danger');
        if (statusLabel) {
          statusLabel.classList.remove('status-good', 'status-warning', 'status-danger');
        }
        
        if (percentage >= 100) {
          progressBar.classList.add('bar-danger');
          if (statusLabel) {
            statusLabel.classList.add('status-danger');
            statusLabel.textContent = 'Over Budget';
          }
        } else if (percentage >= 85) {
          progressBar.classList.add('bar-warning');
          if (statusLabel) {
            statusLabel.classList.add('status-warning');
            statusLabel.textContent = 'Near Limit';
          }
        } else {
          progressBar.classList.add('bar-healthy');
          if (statusLabel) {
            statusLabel.classList.add('status-good');
            statusLabel.textContent = 'On Track';
          }
        }
      }
    });
  });

  // Render Goals List
  goalsListContainer.innerHTML = '';
  if (state.goals.length === 0) {
    goalsListContainer.innerHTML = '<p style="grid-column: span 12; text-align: center; color: var(--color-text-muted); margin-top: 2rem;">No active savings or debt payoff goals. Create one to get started!</p>';
  } else {
    state.goals.forEach(goal => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      const percentage = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
      
      card.innerHTML = `
        <div class="goal-card-header">
          <div>
            <h3 class="goal-card-title">${goal.name}</h3>
            <span class="goal-card-type-chip ${goal.type === 'savings' ? 'type-savings' : 'type-debt'}">
              ${goal.type === 'savings' ? 'Savings/Asset Growth' : 'Debt Payoff'}
            </span>
          </div>
          <button class="btn btn-secondary btn-contrib-trigger" data-goal-id="${goal.id}" style="min-height: 2.5rem; padding: 0 1rem; font-size: 0.85rem;">
            ${goal.type === 'savings' ? 'Save More' : 'Pay Down'}
          </button>
        </div>
        <div class="goal-card-content">
          <div class="progress-container">
            <div class="progress-label-row">
              <span>Progress: ${formatZAR(goal.current)}</span>
              <span>Target: ${formatZAR(goal.target)}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar ${goal.type === 'savings' ? 'bar-healthy' : 'bar-warning'}" style="width: ${percentage}%"></div>
            </div>
          </div>
        </div>
      `;
      
      card.querySelector('.btn-contrib-trigger').addEventListener('click', () => {
        openContributeModal(goal.id);
      });
      
      goalsListContainer.appendChild(card);
    });
  }

  // Draw Insights SVG Chart
  drawSpendChart();
  
  // Render Dynamic Ramsey Tips
  renderRamseyTips();
  
  // Render Debt Snowball Calculator Results
  renderDebtSnowball();

  // Render recent transaction list
  triggerFilter();
}

// Form Validation and Submission for Transactions
quickAddForm.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Submit event triggered');
  
  // Reset errors
  descInput.classList.remove('invalid');
  amountInput.classList.remove('invalid');
  descError.textContent = '';
  amountError.textContent = '';
  
  let isValid = true;
  
  const desc = descInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeSelect.value;
  const category = categorySelect.value;
  
  console.log('Parsed inputs:', { desc, amount, type, category });
  
  if (!desc || desc.length < 2) {
    descInput.classList.add('invalid');
    descError.textContent = 'Please enter a valid description (at least 2 chars).';
    isValid = false;
  }
  
  if (isNaN(amount) || amount <= 0) {
    amountInput.classList.add('invalid');
    amountError.textContent = 'Please enter a valid amount greater than 0.';
    isValid = false;
  }
  
  console.log('Is valid:', isValid);
  if (!isValid) return;
  
  // Add transaction to state
  const newTx = {
    id: Date.now(),
    description: desc,
    amount: amount,
    type: type,
    category: category
  };
  
  state.transactions.push(newTx);
  
  // Update state values based on type
  if (type === 'income') {
    state.assets += amount;
  } else {
    state.liabilities += amount;
    if (state.budgets[category]) {
      state.budgets[category].spent += amount;
    }
  }
  
  // Reset form inputs
  descInput.value = '';
  amountInput.value = '';
  
  // Close transaction modal
  saveStateToDB();
  toggleModal(quickAddModal, false);
  
  // Update UI instantly
  updateDashboardUI();
});

// 7. Reset and Clear Database click handler
const btnClearDatabase = document.getElementById('btn-clear-database');
if (btnClearDatabase) {
  btnClearDatabase.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete and reset all data to zeros? This action cannot be undone.')) {
      state = {
        assets: 0.00,
        liabilities: 0.00,
        transactions: [],
        budgets: {
          'Groceries': { spent: 0.00, limit: 0.00 },
          'Fuel': { spent: 0.00, limit: 0.00 },
          'Dining': { spent: 0.00, limit: 0.00 },
          'Housing': { spent: 0.00, limit: 0.00 },
          'PersonalCare': { spent: 0.00, limit: 0.00 },
          'Entertainment': { spent: 0.00, limit: 0.00 },
          'Savings': { spent: 0.00, limit: 0.00 }
        },
        goals: []
      };
      saveStateToDB();
      updateDashboardUI();
      alert('All dashboard state data has been successfully cleared & reset to zeros.');
    }
  });
}

// 8. User Auth Login & Logout Flow
const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('login-username');
const passwordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    if (!username) {
      loginError.textContent = 'Please select a username.';
      return;
    }
    
    // Validate credentials (6-character personalized passwords)
    const expectedPassword = username === 'Romeo' ? 'romeo6' : 'nandi6';
    if (password === expectedPassword) {
      localStorage.setItem('current_user', username);
      loadUserState(username);
      loginScreen.classList.add('hidden');
      setTimeout(() => {
        loginScreen.style.display = 'none';
      }, 300); // Allow fadeout transition
      passwordInput.value = '';
    } else {
      loginError.textContent = `Incorrect password. Try "${expectedPassword}".`;
      passwordInput.focus();
    }
  });
}

// Password Visibility Toggle
const btnTogglePassword = document.getElementById('btn-toggle-password');
const visibilityIcon = document.getElementById('password-visibility-icon');

if (btnTogglePassword && passwordInput && visibilityIcon) {
  btnTogglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      visibilityIcon.textContent = 'visibility';
    } else {
      passwordInput.type = 'password';
      visibilityIcon.textContent = 'visibility_off';
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('current_user');
    currentUser = null;
    
    // Reset login form fields
    usernameInput.value = '';
    passwordInput.value = '';
    
    // Clear global state & update UI so no user data remains visible
    state = JSON.parse(JSON.stringify(defaultState));
    updateDashboardUI();
    
    loginScreen.style.display = 'flex';
    setTimeout(() => {
      loginScreen.classList.remove('hidden');
    }, 10);
  });
}

// Check active session on load
const savedUser = localStorage.getItem('current_user');
if (savedUser && (savedUser === 'Romeo' || savedUser === 'Nandipha')) {
  loadUserState(savedUser);
  loginScreen.classList.add('hidden');
  loginScreen.style.display = 'none';
} else {
  currentUser = null;
  state = JSON.parse(JSON.stringify(defaultState));
  updateDashboardUI();
  loginScreen.style.display = 'flex';
  loginScreen.classList.remove('hidden');
}
