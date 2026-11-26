// Supabase Configuration
const SUPABASE_URL = 'https://ewdwsbpncziwfxczbbfd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NEGY1iWKXYYMM7Qibr3anw_U4wpJjCi';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let user = null;
let isSignUpMode = false;

// DOM Elements
const authScreen = document.getElementById('authScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const authForm = document.getElementById('authForm');
const authHeading = document.getElementById('authHeading');
const authSubtitle = document.getElementById('authSubtitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleBtn = document.getElementById('authToggleBtn');
const authToggleText = document.getElementById('authToggleText');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('toast');

const expenseForm = document.getElementById('expenseForm');
const expenseAmount = document.getElementById('expenseAmount');
const expenseCategory = document.getElementById('expenseCategory');
const expenseDesc = document.getElementById('expenseDesc');
const totalSpentText = document.getElementById('totalSpentText');
const summaryCountText = document.getElementById('summaryCountText');
const transactionsContainer = document.getElementById('transactionsContainer');
const installAppBtn = document.getElementById('installAppBtn');

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3000);
}

// Auth Form Toggle
authToggleBtn.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    authHeading.textContent = "Create Account";
    authSubtitle.textContent = "Start tracking your spending";
    authSubmitBtn.textContent = "Sign Up";
    authToggleText.textContent = "Already have an account?";
    authToggleBtn.textContent = "Sign In";
  } else {
    authHeading.textContent = "Sign In";
    authSubtitle.textContent = "Access your personal expense dashboard";
    authSubmitBtn.textContent = "Sign In";
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = "Sign Up";
  }
});

// Auth Submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Please wait...";

  try {
    if (isSignUpMode) {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;
      showToast("Account created successfully!");
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast("Signed in!");
    }
  } catch (err) {
    alert(err.message);
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Sign In";
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await db.auth.signOut();
  showToast("Logged out");
});

// Auth State Listener
db.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    user = session.user;
    authScreen.hidden = true;
    dashboardScreen.hidden = false;
    logoutBtn.hidden = false;
    loadExpenses();
  } else {
    user = null;
    authScreen.hidden = false;
    dashboardScreen.hidden = true;
    logoutBtn.hidden = true;
  }
});

// Expenses Logic
async function loadExpenses() {
  if (!user) return;

  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  renderExpenses(data || []);
}

function renderExpenses(list) {
  const total = list.reduce((sum, item) => sum + Number(item.amount), 0);
  totalSpentText.textContent = `₦${total.toLocaleString('en-NG')}`;
  summaryCountText.textContent = `${list.length} transaction${list.length === 1 ? '' : 's'}`;

  if (list.length === 0) {
    transactionsContainer.innerHTML = '<p class="empty-state">No expenses yet. Add your first one above!</p>';
    return;
  }

  const categoryIcons = {
    'Food & Drinks': '🍔',
    'Transport': '🚖',
    'Data & Airtime': '📶',
    'Gadgets & Tools': '💻',
    'Personal & Shopping': '🛍️',
    'Bills & Rent': '🏠',
    'Other': '📦'
  };

  transactionsContainer.innerHTML = list.map(item => {
    const icon = categoryIcons[item.category] || '💸';
    const title = item.description || item.category;
    const date = new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon">${icon}</div>
          <div>
            <div class="tx-title">${escapeHtml(title)}</div>
            <div class="tx-meta">${item.category} • ${date}</div>
          </div>
        </div>
        <div class="tx-right">
          <span class="tx-amount">-₦${Number(item.amount).toLocaleString('en-NG')}</span>
          <button class="tx-delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!user) return;

  const amount = parseFloat(expenseAmount.value);
  const category = expenseCategory.value;
  const description = expenseDesc.value.trim();

  const saveBtn = document.getElementById('saveExpenseBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const { error } = await db.from('expenses').insert([{
    user_id: user.id,
    amount: amount,
    category: category,
    description: description
  }]);

  saveBtn.disabled = false;
  saveBtn.textContent = "Save Expense";

  if (error) {
    alert("Could not save: " + error.message);
  } else {
    expenseForm.reset();
    showToast("Expense added!");
    loadExpenses();
  }
});

window.deleteItem = async function(id) {
  if (!confirm("Delete this expense?")) return;

  const { error } = await db.from('expenses').delete().eq('id', id);
  if (error) {
    alert(error.message);
  } else {
    showToast("Deleted");
    loadExpenses();
  }
};

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// PWA Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installAppBtn) installAppBtn.hidden = false;
});

if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      installAppBtn.hidden = true;
    }
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installAppBtn) installAppBtn.hidden = true;
  showToast("Installed to your phone!");
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}