Вот структура Redux состояний в вашем приложении:

📦 Redux Store (Главное хранилище)
У вас есть 2 основных состояния (slices):

1️⃣ projects (Проекты)
Состояние:
{
  projects: Project[],        // Массив всех проектов
  currentProjectId: string    // ID текущего выбранного проекта
}

Что в проекте:
id - уникальный ID
name - название
description - описание
createdAt - дата создания
pinned - закреплён или нет
tags - теги проекта
Actions (действия):

addProject - добавить проект
updateProject - обновить проект
deleteProject - удалить проект
setCurrentProject - выбрать текущий проект
toggleProjectPin - закрепить/открепить
cloneProject - клонировать проект
updateProjectTags - обновить теги

2️⃣ reports (Отчёты)
Состояние:
{
  reports: { [projectId]: Report[] },  // Отчёты по проектам
  currentReportId: string              // ID текущего отчёта
}

Что в отчёте:

id - уникальный ID
name - название отчёта
projectId - к какому проекту относится
selections - выбранные объекты (accounts, campaigns, adsets, ads, creatives)
activeTab - активная вкладка
selectedMetrics - выбранные метрики
pinned - закреплён или нет
tags - теги отчёта
Actions (действия):
addReport - добавить отчёт
updateReport - обновить отчёт
deleteReport - удалить отчёт
setCurrentReport - выбрать текущий отчёт
updateSelections - обновить выборки в отчёте
clearProjectReports - очистить все отчёты проекта

💾 Автосохранение в localStorage
Всё состояние автоматически сохраняется в localStorage через middleware и восстанавливается при загрузке приложения.

Как использовать в компонентах:
// Получить данные
const projects = useAppSelector(state => state.projects.projects);
const currentProjectId = useAppSelector(state => state.projects.currentProjectId);

// Изменить данные
const dispatch = useAppDispatch();
dispatch(addProject(newProject));
dispatch(setCurrentProject(projectId));