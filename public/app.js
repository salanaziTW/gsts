const API = {
  auth: '/.netlify/functions/auth',
  tasks: '/.netlify/functions/tasks'
};

const STATUS = {
  in_progress: 'تحت التنفيذ',
  pending: 'معلق',
  completed: 'مكتمل'
};

const els = {
  loginView: document.getElementById('loginView'),
  dashboardView: document.getElementById('dashboardView'),
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('passwordInput'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  openAddTaskBtn: document.getElementById('openAddTaskBtn'),
  taskDialog: document.getElementById('taskDialog'),
  taskForm: document.getElementById('taskForm'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
  cancelTaskBtn: document.getElementById('cancelTaskBtn'),
  dialogTitle: document.getElementById('dialogTitle'),
  taskId: document.getElementById('taskId'),
  taskTitle: document.getElementById('taskTitle'),
  taskDescription: document.getElementById('taskDescription'),
  taskDueDate: document.getElementById('taskDueDate'),
  taskStatus: document.getElementById('taskStatus'),
  searchInput: document.getElementById('searchInput'),
  dateFilter: document.getElementById('dateFilter'),
  statusMessage: document.getElementById('statusMessage'),
  totalCount: document.getElementById('totalCount'),
  inProgressCount: document.getElementById('inProgressCount'),
  pendingCount: document.getElementById('pendingCount'),
  completedCount: document.getElementById('completedCount'),
  columnInProgress: document.getElementById('columnInProgress'),
  columnPending: document.getElementById('columnPending'),
  columnCompleted: document.getElementById('columnCompleted'),
  inProgressList: document.getElementById('inProgressList'),
  pendingList: document.getElementById('pendingList'),
  completedList: document.getElementById('completedList')
};

let tasks = [];
let isLoading = false;
let token = localStorage.getItem('shared_task_token') || '';

function showLogin() {
  els.loginView.classList.remove('hidden');
  els.dashboardView.classList.add('hidden');
  els.passwordInput.focus();
}

function showDashboard() {
  els.loginView.classList.add('hidden');
  els.dashboardView.classList.remove('hidden');
}

function saveToken(newToken) {
  token = newToken;
  localStorage.setItem('shared_task_token', newToken);
}

function clearToken() {
  token = '';
  localStorage.removeItem('shared_task_token');
}

function setMessage(message, isError = false) {
  els.statusMessage.textContent = message || '';
  els.statusMessage.style.color = isError ? '#d92d20' : '#667085';
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return 'بدون تاريخ';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(`${dateString}T12:00:00`));
  } catch (error) {
    return dateString;
  }
}

function isLate(task) {
  return task.status !== 'completed' && task.dueDate && task.dueDate < todayISO();
}

function isWithinWeek(task) {
  if (!task.dueDate) return false;
  const due = new Date(`${task.dueDate}T12:00:00`);
  const now = new Date(`${todayISO()}T12:00:00`);
  const diff = due.getTime() - now.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (response.status === 401) {
    clearToken();
    showLogin();
    throw new Error('انتهت الجلسة أو كلمة المرور غير صحيحة.');
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'حدث خطأ غير متوقع.');
  }

  return payload;
}

async function login(password) {
  const response = await fetch(API.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'كلمة المرور غير صحيحة.');
  }

  saveToken(payload.token);
}

async function loadTasks() {
  if (!token || isLoading) return;
  isLoading = true;
  setMessage('جاري تحميل المهام...');

  try {
    const payload = await apiRequest(API.tasks, { method: 'GET' });
    tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    render();
    setMessage(`آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    isLoading = false;
  }
}

async function createTask(task) {
  await apiRequest(API.tasks, {
    method: 'POST',
    body: JSON.stringify(task)
  });
}

async function updateTask(task) {
  await apiRequest(API.tasks, {
    method: 'PUT',
    body: JSON.stringify(task)
  });
}

async function deleteTask(id) {
  await apiRequest(`${API.tasks}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

function getFilteredTasks() {
  const search = els.searchInput.value.trim().toLowerCase();
  const dateFilter = els.dateFilter.value;

  return tasks.filter((task) => {
    const searchable = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    const matchesSearch = !search || searchable.includes(search);

    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = task.dueDate === todayISO();
    if (dateFilter === 'late') matchesDate = isLate(task);
    if (dateFilter === 'week') matchesDate = isWithinWeek(task);

    return matchesSearch && matchesDate;
  });
}

function createEmptyState(text) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = text;
  return empty;
}

function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card ${isLate(task) ? 'late' : ''} ${task.status === 'completed' ? 'completed' : ''}`;

  const titleRow = document.createElement('div');
  titleRow.className = 'task-title-row';

  const title = document.createElement('h3');
  title.textContent = task.title || 'بدون عنوان';

  const status = document.createElement('span');
  status.className = `status-pill status-${task.status}`;
  status.textContent = STATUS[task.status] || task.status;

  titleRow.append(title, status);

  const description = document.createElement('p');
  description.className = 'task-description';
  description.textContent = task.description || 'لا يوجد وصف.';

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const due = document.createElement('span');
  due.textContent = `تاريخ التسليم: ${formatDate(task.dueDate)}`;
  meta.appendChild(due);

  if (isLate(task)) {
    const late = document.createElement('span');
    late.className = 'late-label';
    late.textContent = 'متأخرة';
    meta.appendChild(late);
  }

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const statusSelect = document.createElement('select');
  Object.entries(STATUS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = task.status === value;
    statusSelect.appendChild(option);
  });

  statusSelect.addEventListener('change', async () => {
    const updated = { ...task, status: statusSelect.value };
    try {
      setMessage('جاري تحديث الحالة...');
      await updateTask(updated);
      await loadTasks();
    } catch (error) {
      setMessage(error.message, true);
      statusSelect.value = task.status;
    }
  });

  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';

  const editBtn = document.createElement('button');
  editBtn.className = 'small-btn';
  editBtn.type = 'button';
  editBtn.textContent = 'تعديل';
  editBtn.addEventListener('click', () => openEditTask(task));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger-btn';
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'حذف';
  deleteBtn.addEventListener('click', async () => {
    const ok = window.confirm(`هل تريد حذف المهمة: ${task.title}؟`);
    if (!ok) return;

    try {
      setMessage('جاري حذف المهمة...');
      await deleteTask(task.id);
      await loadTasks();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  actionButtons.append(editBtn, deleteBtn);
  actions.append(statusSelect, actionButtons);
  card.append(titleRow, description, meta, actions);
  return card;
}

function renderColumn(listElement, columnCountElement, items, emptyText) {
  listElement.innerHTML = '';
  columnCountElement.textContent = items.length;

  if (!items.length) {
    listElement.appendChild(createEmptyState(emptyText));
    return;
  }

  items.forEach((task) => listElement.appendChild(createTaskCard(task)));
}

function render() {
  const filtered = getFilteredTasks();
  const counts = {
    total: tasks.length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    completed: tasks.filter((task) => task.status === 'completed').length
  };

  els.totalCount.textContent = counts.total;
  els.inProgressCount.textContent = counts.in_progress;
  els.pendingCount.textContent = counts.pending;
  els.completedCount.textContent = counts.completed;

  renderColumn(
    els.inProgressList,
    els.columnInProgress,
    filtered.filter((task) => task.status === 'in_progress'),
    'لا توجد مهام تحت التنفيذ.'
  );

  renderColumn(
    els.pendingList,
    els.columnPending,
    filtered.filter((task) => task.status === 'pending'),
    'لا توجد مهام معلقة.'
  );

  renderColumn(
    els.completedList,
    els.columnCompleted,
    filtered.filter((task) => task.status === 'completed'),
    'لا توجد مهام مكتملة.'
  );
}

function openAddTask() {
  els.dialogTitle.textContent = 'إضافة مهمة';
  els.taskId.value = '';
  els.taskTitle.value = '';
  els.taskDescription.value = '';
  els.taskDueDate.value = todayISO();
  els.taskStatus.value = 'in_progress';
  els.taskDialog.showModal();
  els.taskTitle.focus();
}

function openEditTask(task) {
  els.dialogTitle.textContent = 'تعديل مهمة';
  els.taskId.value = task.id;
  els.taskTitle.value = task.title || '';
  els.taskDescription.value = task.description || '';
  els.taskDueDate.value = task.dueDate || todayISO();
  els.taskStatus.value = task.status || 'in_progress';
  els.taskDialog.showModal();
  els.taskTitle.focus();
}

function closeDialog() {
  if (els.taskDialog.open) els.taskDialog.close();
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.loginError.textContent = '';
  const password = els.passwordInput.value;

  try {
    await login(password);
    els.passwordInput.value = '';
    showDashboard();
    await loadTasks();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
});

els.logoutBtn.addEventListener('click', () => {
  clearToken();
  showLogin();
});

els.refreshBtn.addEventListener('click', loadTasks);
els.openAddTaskBtn.addEventListener('click', openAddTask);
els.closeDialogBtn.addEventListener('click', closeDialog);
els.cancelTaskBtn.addEventListener('click', closeDialog);
els.searchInput.addEventListener('input', render);
els.dateFilter.addEventListener('change', render);

els.taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    id: els.taskId.value || undefined,
    title: els.taskTitle.value.trim(),
    description: els.taskDescription.value.trim(),
    dueDate: els.taskDueDate.value,
    status: els.taskStatus.value
  };

  if (!payload.title || !payload.dueDate) {
    setMessage('العنوان وتاريخ التسليم مطلوبان.', true);
    return;
  }

  try {
    setMessage('جاري حفظ المهمة...');
    if (payload.id) {
      await updateTask(payload);
    } else {
      await createTask(payload);
    }
    closeDialog();
    await loadTasks();
  } catch (error) {
    setMessage(error.message, true);
  }
});

if (token) {
  showDashboard();
  loadTasks();
} else {
  showLogin();
}

setInterval(() => {
  if (token && !els.taskDialog.open) {
    loadTasks();
  }
}, 15000);
