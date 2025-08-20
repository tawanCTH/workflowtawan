document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const projectSelect = document.getElementById('project-select');
    const addProjectBtn = document.getElementById('add-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const boardContainer = document.getElementById('board-container');
    const loader = document.getElementById('loader');

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

    // --- PASTE YOUR GOOGLE SCRIPT URL HERE ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2PDagLHHkp-Kcple_HO65y6CsWtc60dFiWKSapd-FrBVyyDnUjQD5tp0PIKTO5Ian3Q/exec'; // << ❗❗❗ วาง URL ล่าสุดของคุณที่นี่ ❗❗❗

    let data = {};

    // --- LOADER & TEXTAREA FUNCTIONS ---
    function showLoader() { loader.style.display = 'flex'; }
    function hideLoader() { loader.style.display = 'none'; }
    function autoResizeTextarea(element) {
        element.style.height = 'auto';
        element.style.height = (element.scrollHeight) + 'px';
    }
    taskDescriptionInput.addEventListener('input', () => autoResizeTextarea(taskDescriptionInput));


    // --- DATA MANAGEMENT ---
    async function initializeData() {
        showLoader();
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
            hideLoader();
        }
    }

    async function saveData(actionInfo = null) {
        showLoader();
        try {
            const payload = {
                boardData: data,
                actionInfo: actionInfo
            };
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (error) {
            console.error('Failed to save data:', error);
            alert('ไม่สามารถบันทึกข้อมูลไปยัง Google Sheets ได้');
        } finally {
            hideLoader();
        }
    }

    // --- RENDER FUNCTIONS ---
    function findCurrentProject() { return data.projects.find(p => p.id === data.currentProjectId); }
    function render() { renderProjectSelector(); renderBoard(); }
    function renderProjectSelector() { projectSelect.innerHTML = ''; data.projects.forEach(project => { const option = document.createElement('option'); option.value = project.id; option.textContent = project.name; if (project.id === data.currentProjectId) { option.selected = true; } projectSelect.appendChild(option); }); }
    function renderBoard() { boardContainer.innerHTML = ''; const project = findCurrentProject(); if (!project) return; project.lists.forEach(list => { const listEl = document.createElement('div'); listEl.className = 'list'; listEl.dataset.listId = list.id; listEl.innerHTML = `<div class="list-header"><h2 class="list-title" contenteditable="true">${list.name}</h2><button class="add-task-btn" data-list-id="${list.id}">+</button></div><div class="task-list"></div>`; const taskListEl = listEl.querySelector('.task-list'); list.tasks.forEach(task => { const taskEl = createTaskElement(task, list.id); taskListEl.appendChild(taskEl); }); boardContainer.appendChild(listEl); }); }
    
    function createTaskElement(task, listId) {
        const taskEl = document.createElement('div');
        taskEl.className = 'task';
        taskEl.draggable = true;
        taskEl.dataset.taskId = task.id;
        taskEl.dataset.listId = listId;
        taskEl.dataset.fullDescription = task.description || '';

        let descriptionHtml = task.description || '';
        if (descriptionHtml.length > 50) {
            descriptionHtml = `${descriptionHtml.substring(0, 50)}... <a href="#" class="show-more-link"> (กดเพื่อดูเพิ่มเติม)</a>`;
        }

        let dueDateHTML = '';
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            dueDateHTML = `<div class="task-due-date">แจ้งเตือน: ${date.toLocaleString('th-TH')}</div>`;
        }

        taskEl.innerHTML = `
            <button class="delete-task-btn" title="ลบทาสก์นี้">&times;</button>
            <h4>${task.title}</h4>
            <p>${descriptionHtml}</p>
            ${dueDateHTML}
        `;
        return taskEl;
    }

    // --- EVENT HANDLERS ---
    addProjectBtn.addEventListener('click', async () => { const projectName = prompt('กรุณาใส่ชื่อโปรเจกต์ใหม่:'); if (projectName) { const newProject = { id: `proj-${Date.now()}`, name: projectName, lists: [{ id: `list-${Date.now()}-1`, name: "Todo", tasks: [] }, { id: `list-${Date.now()}-2`, name: "In Progress", tasks: [] }, { id: `list-${Date.now()}-3`, name: "Complete", tasks: [] }] }; data.projects.push(newProject); data.currentProjectId = newProject.id; await saveData({ type: 'project_create', projectName: projectName }); render(); } });
    deleteProjectBtn.addEventListener('click', async () => { const project = findCurrentProject(); if (!project) { alert("ไม่มีโปรเจกต์ให้ลบ"); return; } if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${project.name}" ทั้งหมด?`)) { data.projects = data.projects.filter(p => p.id !== data.currentProjectId); const deletedProjectName = project.name; data.currentProjectId = data.projects.length > 0 ? data.projects[0].id : null; await saveData({ type: 'project_delete', projectName: deletedProjectName }); render(); } });
    
    projectSelect.addEventListener('change', async () => {
        showLoader();
        data.currentProjectId = projectSelect.value;
        await saveData({ type: 'project_switch' }); 
        renderBoard();
    });

    boardContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-task-btn')) {
            openTaskModal(null, e.target.dataset.listId);
        } else if (e.target.classList.contains('delete-task-btn')) {
            const taskEl = e.target.closest('.task');
            const taskId = taskEl.dataset.taskId;
            const listId = taskEl.dataset.listId;
            const list = findCurrentProject().lists.find(l => l.id === listId);
            const task = list.tasks.find(t => t.id === taskId);
            if (confirm(`คุณต้องการลบทาสก์ "${task.title}" หรือไม่?`)) {
                list.tasks = list.tasks.filter(t => t.id !== taskId);
                await saveData({ type: 'task_delete', taskTitle: task.title, listName: list.name });
                renderBoard();
            }
        } else if (e.target.closest('.task')) {
            e.preventDefault();
            const taskEl = e.target.closest('.task');
            openTaskModal(taskEl.dataset.taskId, taskEl.dataset.listId);
        }
    });

    boardContainer.addEventListener('focusout', async (e) => { if (e.target.classList.contains('list-title')) { const newTitle = e.target.textContent; const listId = e.target.closest('.list').dataset.listId; const list = findCurrentProject().lists.find(l => l.id === listId); if (list && list.name !== newTitle) { const oldTitle = list.name; list.name = newTitle; await saveData({ type: 'list_rename', oldListName: oldTitle, newListName: newTitle }); } } });
    saveTaskBtn.addEventListener('click', async () => { const taskId = taskIdInput.value; const listId = sourceListIdInput.value; const title = taskTitleInput.value.trim(); const description = taskDescriptionInput.value.trim(); const dueDate = taskDueDateInput.value; if (!title) { alert('กรุณาใส่หัวข้อ'); return; } const list = findCurrentProject().lists.find(l => l.id === listId); let actionInfo; if (taskId) { const task = list.tasks.find(t => t.id === taskId); actionInfo = { type: 'task_edit', taskTitle: title, listName: list.name }; task.title = title; task.description = description; task.dueDate = dueDate; } else { list.tasks.push({ id: `task-${Date.now()}`, title, description, dueDate }); actionInfo = { type: 'task_create', taskTitle: title, listName: list.name }; } await saveData(actionInfo); renderBoard(); closeTaskModal(); });
    let draggedTask = null; boardContainer.addEventListener('dragstart', (e) => { if (e.target.classList.contains('task')) { draggedTask = e.target; e.target.classList.add('dragging'); } }); boardContainer.addEventListener('dragend', (e) => { if (e.target.classList.contains('task')) { e.target.classList.remove('dragging'); draggedTask = null; } }); boardContainer.addEventListener('dragover', (e) => e.preventDefault());
    boardContainer.addEventListener('drop', async (e) => { e.preventDefault(); if (draggedTask) { const targetListEl = e.target.closest('.list'); if (targetListEl) { const targetListId = targetListEl.dataset.listId; const taskId = draggedTask.dataset.taskId; const sourceListId = draggedTask.closest('.list').dataset.listId; if (sourceListId !== targetListId) { const project = findCurrentProject(); const sourceList = project.lists.find(l => l.id === sourceListId); const targetList = project.lists.find(l => l.id === targetListId); const taskIndex = sourceList.tasks.findIndex(t => t.id === taskId); const [task] = sourceList.tasks.splice(taskIndex, 1); targetList.tasks.push(task); const actionInfo = { type: 'task_move', taskTitle: task.title, taskDescription: task.description, fromListName: sourceList.name, toListName: targetList.name }; await saveData(actionInfo); renderBoard(); } } } });

    // --- MODAL FUNCTIONS ---
    function openTaskModal(taskId = null, listId) {
        taskTitleInput.value = '';
        taskDescriptionInput.value = '';
        taskDueDateInput.value = '';
        taskIdInput.value = '';
        sourceListIdInput.value = listId;
        if (taskId) {
            modalTitle.textContent = 'แก้ไข Task';
            const task = findCurrentProject().lists.find(l => l.id === listId).tasks.find(t => t.id === taskId);
            taskIdInput.value = task.id;
            taskTitleInput.value = task.title;
            taskDescriptionInput.value = task.description;
            if (task.dueDate) {
                taskDueDateInput.value = task.dueDate;
            }
        } else {
            modalTitle.textContent = 'สร้าง Task ใหม่';
        }
        taskModal.style.display = 'block';
        setTimeout(() => autoResizeTextarea(taskDescriptionInput), 0);
    }

    function closeTaskModal() {
        taskModal.style.display = 'none';
    }

    closeModalBtn.addEventListener('click', closeTaskModal);
    window.addEventListener('click', (e) => { if (e.target === taskModal) { closeTaskModal(); } });

    // --- REMINDER FUNCTION (Client-side alert for now) ---
    function checkReminders() {
        const now = new Date();
        const project = findCurrentProject();
        if (!project) return;
        project.lists.forEach(list => {
            list.tasks.forEach(task => {
                if (task.dueDate && !task.notified) {
                    const dueDate = new Date(task.dueDate);
                    const diffMinutes = (dueDate.getTime() - now.getTime()) / 60000;
                    task.notified = task.notified || {};
                    if (diffMinutes <= 40 && diffMinutes > 39 && !task.notified['40min']) {
                        alert(`Reminder: Task "${task.title}" is due in 40 minutes!`);
                        task.notified['40min'] = true;
                        saveData();
                    }
                    if (diffMinutes <= 30 && diffMinutes > 29 && !task.notified['30min']) {
                        alert(`Reminder: Task "${task.title}" is due in 30 minutes!`);
                        task.notified['30min'] = true;
                        saveData();
                    }
                }
            });
        });
    }
    
    async function startApp() {
        await initializeData();
        render();
        setInterval(checkReminders, 60000);
    }

    startApp();
});
