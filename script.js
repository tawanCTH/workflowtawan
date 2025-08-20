document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const projectSelect = document.getElementById('project-select');
    const addProjectBtn = document.getElementById('add-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn'); // New
    const boardContainer = document.getElementById('board-container');
    const loader = document.getElementById('loader'); // New

    // Task Modal Elements
    const taskModal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const closeModalBtn = taskModal.querySelector('.close-btn');
    const taskIdInput = document.getElementById('task-id');
    const sourceListIdInput = document.getElementById('source-list-id');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescriptionInput = document.getElementById('task-description');
    const taskDueDateInput = document.getElementById('task-due-date');

    // Notification Modal Elements
    const notificationModal = document.getElementById('notification-modal');
    const closeNotificationBtn = document.getElementById('close-notification-btn');
    const sendEmailLink = document.getElementById('send-email-link');

    // --- PASTE YOUR GOOGLE SCRIPT URL HERE ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvhrIH8DEUv3bytQzymsGrL63-MQ25ilZAwGbBvCaW9Q9SmzwF0lT9V525X9ghKpkxZQ/exec'; // << ❗❗❗ วาง URL ของคุณที่นี่ ❗❗❗

    let data = {};

    // --- LOADER FUNCTIONS (NEW) ---
    function showLoader() {
        loader.style.display = 'flex';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }

    // --- DATA MANAGEMENT ---
    async function initializeData() {
        showLoader(); // Show loader on initial load
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            data = await response.json();
            if (!data || !data.projects || data.projects.length === 0) {
                data = { projects: [{ id: `proj-${Date.now()}`, name: "โปรเจกต์ตัวอย่าง", lists: [{ id: `list-${Date.now()}-1`, name: "Todo", tasks: [] }, { id: `list-${Date.now()}-2`, name: "In Progress", tasks: [] }, { id: `list-${Date.now()}-3`, name: "Complete", tasks: [] }] }], currentProjectId: null };
                data.currentProjectId = data.projects[0].id;
                await saveData();
            }
            if (!data.currentProjectId || !data.projects.find(p => p.id === data.currentProjectId)) {
                data.currentProjectId = data.projects.length > 0 ? data.projects[0].id : null;
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            alert('ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
        } finally {
            hideLoader(); // Hide loader after loading is done
        }
    }

    async function saveData() {
        showLoader(); // Show loader before saving
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        } catch (error) {
            console.error('Failed to save data:', error);
            alert('ไม่สามารถบันทึกข้อมูลไปยัง Google Sheets ได้');
        } finally {
            hideLoader(); // Hide loader after saving
        }
    }

    // --- RENDER FUNCTIONS ---
    function findCurrentProject() { return data.projects.find(p => p.id === data.currentProjectId); }
    function render() { renderProjectSelector(); renderBoard(); }
    function renderProjectSelector() { projectSelect.innerHTML = ''; data.projects.forEach(project => { const option = document.createElement('option'); option.value = project.id; option.textContent = project.name; if (project.id === data.currentProjectId) { option.selected = true; } projectSelect.appendChild(option); }); }
    function renderBoard() { boardContainer.innerHTML = ''; const project = findCurrentProject(); if (!project) return; project.lists.forEach(list => { const listEl = document.createElement('div'); listEl.className = 'list'; listEl.dataset.listId = list.id; listEl.innerHTML = `<div class="list-header"><h2 class="list-title" contenteditable="true">${list.name}</h2><button class="add-task-btn" data-list-id="${list.id}">+</button></div><div class="task-list"></div>`; const taskListEl = listEl.querySelector('.task-list'); list.tasks.forEach(task => { const taskEl = createTaskElement(task, list.id); taskListEl.appendChild(taskEl); }); boardContainer.appendChild(listEl); }); }
    
    // Modified to include delete button
    function createTaskElement(task, listId) {
        const taskEl = document.createElement('div');
        taskEl.className = 'task';
        taskEl.draggable = true;
        taskEl.dataset.taskId = task.id;
        taskEl.dataset.listId = listId; // Keep track of listId
        let dueDateHTML = '';
        if (task.dueDate) { const date = new Date(task.dueDate); dueDateHTML = `<div class="task-due-date">แจ้งเตือน: ${date.toLocaleString('th-TH')}</div>`; }
        taskEl.innerHTML = `
            <button class="delete-task-btn" title="ลบทาสก์นี้">&times;</button>
            <h4>${task.title}</h4>
            <p>${task.description}</p>
            ${dueDateHTML}
        `;
        return taskEl;
    }

    // --- EVENT HANDLERS ---
    addProjectBtn.addEventListener('click', async () => {
        const projectName = prompt('กรุณาใส่ชื่อโปรเจกต์ใหม่:');
        if (projectName) {
            const newProject = { id: `proj-${Date.now()}`, name: projectName, lists: [{ id: `list-${Date.now()}-1`, name: "Todo", tasks: [] }, { id: `list-${Date.now()}-2`, name: "In Progress", tasks: [] }, { id: `list-${Date.now()}-3`, name: "Complete", tasks: [] }] };
            data.projects.push(newProject);
            data.currentProjectId = newProject.id;
            await saveData();
            render();
        }
    });
    
    // New Project Deletion Handler
    deleteProjectBtn.addEventListener('click', async () => {
        const project = findCurrentProject();
        if (!project) {
            alert("ไม่มีโปรเจกต์ให้ลบ");
            return;
        }
        if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${project.name}" ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            data.projects = data.projects.filter(p => p.id !== data.currentProjectId);
            // Set current project to the first one available, or null if none left
            data.currentProjectId = data.projects.length > 0 ? data.projects[0].id : null;
            await saveData();
            render();
        }
    });

    projectSelect.addEventListener('change', async () => {
        showLoader(); // Show loader when switching projects
        data.currentProjectId = projectSelect.value;
        await saveData();
        // No need to hide loader here, saveData does it.
        renderBoard();
    });
    
    // Modified to handle task deletion
    boardContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-task-btn')) {
            openTaskModal(null, e.target.dataset.listId);
        } else if (e.target.classList.contains('delete-task-btn')) {
            const taskEl = e.target.closest('.task');
            const taskId = taskEl.dataset.taskId;
            const listId = taskEl.dataset.listId;
            const project = findCurrentProject();
            const list = project.lists.find(l => l.id === listId);
            const task = list.tasks.find(t => t.id === taskId);
            
            if (confirm(`คุณต้องการลบทาสก์ "${task.title}" หรือไม่?`)) {
                list.tasks = list.tasks.filter(t => t.id !== taskId);
                await saveData();
                renderBoard();
            }
        } else if (e.target.closest('.task')) {
            const taskEl = e.target.closest('.task');
            openTaskModal(taskEl.dataset.taskId, taskEl.closest('.list').dataset.listId);
        }
    });

    boardContainer.addEventListener('focusout', async (e) => { if (e.target.classList.contains('list-title')) { const newTitle = e.target.textContent; const listId = e.target.closest('.list').dataset.listId; const list = findCurrentProject().lists.find(l => l.id === listId); if (list && list.name !== newTitle) { list.name = newTitle; await saveData(); } } });
    saveTaskBtn.addEventListener('click', async () => { const taskId = taskIdInput.value; const listId = sourceListIdInput.value; const title = taskTitleInput.value.trim(); const description = taskDescriptionInput.value.trim(); const dueDate = taskDueDateInput.value; if (!title) { alert('กรุณาใส่หัวข้อ'); return; } const list = findCurrentProject().lists.find(l => l.id === listId); if (taskId) { const task = list.tasks.find(t => t.id === taskId); if (task.title !== title || task.description !== description) { generateEmail('edit', { ...task, newTitle: title, newDescription: description }); } task.title = title; task.description = description; task.dueDate = dueDate; } else { list.tasks.push({ id: `task-${Date.now()}`, title, description, dueDate }); } await saveData(); renderBoard(); closeTaskModal(); });
    let draggedTask = null; boardContainer.addEventListener('dragstart', (e) => { if (e.target.classList.contains('task')) { draggedTask = e.target; e.target.classList.add('dragging'); } }); boardContainer.addEventListener('dragend', (e) => { if (e.target.classList.contains('task')) { e.target.classList.remove('dragging'); draggedTask = null; } }); boardContainer.addEventListener('dragover', (e) => e.preventDefault());
    
    // Modified drop handler for loading
    boardContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (draggedTask) {
            const targetListEl = e.target.closest('.list');
            if (targetListEl) {
                const targetListId = targetListEl.dataset.listId;
                const taskId = draggedTask.dataset.taskId;
                const sourceListId = draggedTask.closest('.list').dataset.listId;
                if (sourceListId !== targetListId) {
                    const project = findCurrentProject();
                    const sourceList = project.lists.find(l => l.id === sourceListId);
                    const targetList = project.lists.find(l => l.id === targetListId);
                    const taskIndex = sourceList.tasks.findIndex(t => t.id === taskId);
                    const [task] = sourceList.tasks.splice(taskIndex, 1);
                    targetList.tasks.push(task);
                    generateEmail('move', task, sourceList, targetList);
                    await saveData();
                    renderBoard();
                }
            }
        }
    });

    function openTaskModal(taskId = null, listId) { taskTitleInput.value = ''; taskDescriptionInput.value = ''; taskDueDateInput.value = ''; taskIdInput.value = ''; sourceListIdInput.value = listId; if (taskId) { modalTitle.textContent = 'แก้ไข Task'; const task = findCurrentProject().lists.find(l => l.id === listId).tasks.find(t => t.id === taskId); taskIdInput.value = task.id; taskTitleInput.value = task.title; taskDescriptionInput.value = task.description; if (task.dueDate) { taskDueDateInput.value = task.dueDate; } } else { modalTitle.textContent = 'สร้าง Task ใหม่'; } taskModal.style.display = 'block'; }
    function closeTaskModal() { taskModal.style.display = 'none'; }
    closeModalBtn.addEventListener('click', closeTaskModal);
    window.addEventListener('click', (e) => { if (e.target === taskModal) { closeTaskModal(); } if (e.target === notificationModal) { closeNotificationModal(); } });
    function openNotificationModal(mailtoLink) { sendEmailLink.href = mailtoLink; notificationModal.style.display = 'block'; }
    function closeNotificationModal() { notificationModal.style.display = 'none'; }
    closeNotificationBtn.addEventListener('click', closeNotificationModal);
    const TO_EMAIL = "tawan.creativehouse@gmail.com";
    function generateEmail(type, task, fromList = null, toList = null) { let subject = ''; let body = ''; if (type === 'edit') { subject = `แก้ไข Task: ${task.title}`; body = `มีการแก้ไขรายละเอียด Task:\n\nหัวข้อเดิม: ${task.title}\nหัวข้อใหม่: ${task.newTitle}\n\nรายละเอียดเดิม:\n${task.description}\n\nรายละเอียดใหม่:\n${task.newDescription}`; } else if (type === 'move') { subject = `Task status: "${task.title}" ถูกย้าย`; body = `Task "${task.title}" ได้ถูกย้ายจาก List "${fromList.name}" ไปยัง "${toList.name}".`; } else if (type === 'reminder') { subject = `แจ้งเตือนนัดหมาย: ${task.title}`; body = `คุณมีนัดหมายสำหรับงาน "${task.title}" ในอีก ${task.minutesBefore} นาที\n\nรายละเอียด:\n${task.description}\n\nเวลา: ${new Date(task.dueDate).toLocaleString('th-TH')}`; } const mailtoLink = `mailto:${TO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; openNotificationModal(mailtoLink); }
    function checkReminders() { const now = new Date(); const project = findCurrentProject(); if (!project) return; project.lists.forEach(list => { list.tasks.forEach(async task => { if (task.dueDate) { const dueDate = new Date(task.dueDate); const diffMinutes = (dueDate.getTime() - now.getTime()) / 60000; task.notified = task.notified || {}; if (diffMinutes <= 40 && diffMinutes > 39 && !task.notified['40min']) { generateEmail('reminder', { ...task, minutesBefore: 40 }); task.notified['40min'] = true; await saveData(); } if (diffMinutes <= 30 && diffMinutes > 29 && !task.notified['30min']) { generateEmail('reminder', { ...task, minutesBefore: 30 }); task.notified['30min'] = true; await saveData(); } } }); }); }
    
    async function startApp() {
        await initializeData();
        render();
        setInterval(checkReminders, 60000);
    }

    startApp();
});
