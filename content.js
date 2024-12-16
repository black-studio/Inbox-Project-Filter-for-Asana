(function() {
    'use strict';

    // Polyfill for GM_addStyle to ensure compatibility with browsers 
    // that don't support Tampermonkey's GM_addStyle function
    function GM_addStyle(css) {
        var head, style;
        head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css.replace(/;/g, ' !important;');
        head.appendChild(style);
    }

    // CSS styles for the project filter UI components
    // Includes styles for the container, select dropdown, and refresh button
    GM_addStyle(`
        #project-filter-container {
            display: flex;
            align-items: center;
            margin: 0 10px;
        }
        #project-filter {
            margin-left: 5px;
            padding: 5px 15px;
            border: 1px solid #E3E3E3;
            border-radius: 8px;
            background-color: #F7F7F7;
            color: #333333;
            font-size: 16px;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            width: 200px;
            outline: none;
        }
        #project-filter:hover {
            background-color: #EFEFEF;
            border-color: #DADADA;
        }
        #refresh-filter {
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            transition: background-color 0.3s ease;
        }
        #refresh-filter:hover {
            background-color: #EFEFEF;
        }
        #refresh-filter svg {
            width: 20px;
            height: 20px;
            fill: #6d6d6d;
        }
    `);

    // Global variables to store UI elements
    let projectFilter;  // Stores the select dropdown element
    let refreshIcon;    // Stores the refresh button element

    /**
     * Creates the project filter UI elements
     * Includes a refresh button and a dropdown select for projects
     * @returns {HTMLElement} Container div with the filter elements
     */
    function createProjectFilter() {
        const container = document.createElement('div');
        container.id = 'project-filter-container';

        refreshIcon = document.createElement('div');
        refreshIcon.id = 'refresh-filter';
        refreshIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        `;
        refreshIcon.addEventListener('click', forceRefresh);

        projectFilter = document.createElement('select');
        projectFilter.id = 'project-filter';
        projectFilter.innerHTML = '<option value="">Projects</option>';

        container.appendChild(refreshIcon);
        container.appendChild(projectFilter);

        return container;
    }

    /**
     * Adds the project filter to the Asana toolbar
     * Only adds if the filter doesn't already exist
     * Initializes the project list and sets up event listeners
     */
    function addProjectFilter() {
        if (document.getElementById('project-filter-container')) return;

        const toolbar = document.querySelector('.GlobalTopbarStructure-middleChildren, .GlobalTopbarStructure-search');
        if (!toolbar) {
            console.warn('Asana Inbox Filter: Toolbar not found');
            return;
        }

        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.appendChild(createProjectFilter());

        updateProjectList();
        projectFilter.addEventListener('change', filterTasks);
    }

    /**
     * Updates the project list in the dropdown
     * Scans all visible inbox tasks and collects unique project names
     * Maintains the current selection when updating the list
     */
    function updateProjectList() {
        const tasks = document.querySelectorAll('.InboxExpandableThread');
        const projects = new Set();

        tasks.forEach(task => {
            const projectTag = task.querySelector('.InboxIconAndNameContext-name--withDefaultColors');
            if (projectTag) {
                projects.add(projectTag.textContent.trim());
            }
        });

        const currentValue = projectFilter.value;
        projectFilter.innerHTML = '<option value="">Projects</option>';

        Array.from(projects).sort().forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectFilter.appendChild(option);
        });

        projectFilter.value = currentValue;
    }

    /**
     * Filters tasks based on the selected project
     * Shows/hides tasks based on their project tag matching the selection
     * Shows all tasks if no project is selected
     */
    function filterTasks() {
        const selectedProject = projectFilter.value;
        const tasks = document.querySelectorAll('.InboxExpandableThread');

        tasks.forEach(task => {
            const projectTag = task.querySelector('.InboxIconAndNameContext-name--withDefaultColors');
            if (projectTag) {
                task.style.display = (selectedProject === '' || projectTag.textContent.trim() === selectedProject) ? '' : 'none';
            }
        });
    }

    /**
     * Manually triggers a refresh of the project list and reapplies filters
     * Called when the refresh button is clicked
     */
    function forceRefresh() {
        updateProjectList();
        filterTasks();
    }

    /**
     * Removes the project filter from the DOM
     * Called when navigating away from the inbox
     */
    function removeProjectFilter() {
        document.getElementById('project-filter-container')?.remove();
    }

    /**
     * Debounce utility function to limit the rate of function execution
     * @param {Function} func - The function to debounce
     * @param {number} wait - The debounce delay in milliseconds
     * @returns {Function} Debounced version of the input function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Debounced function to check the current page and manage filter visibility
     * Adds filter on inbox page and removes it on other pages
     */
    const debouncedCheckAndAddFilter = debounce(() => {
        const isInInbox = window.location.pathname.includes('/inbox');
        if (isInInbox) {
            addProjectFilter();
        } else {
            removeProjectFilter();
        }
    }, 300);

    /**
     * Sets up DOM observers to watch for changes in Asana's interface
     * Monitors:
     * - General DOM changes for page navigation
     * - Inbox container for new tasks
     * - Inbox feed for archived items
     * Updates the filter accordingly when changes are detected
     */
    function observeDOM() {
        const observer = new MutationObserver(debouncedCheckAndAddFilter);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        window.addEventListener('popstate', debouncedCheckAndAddFilter);
        window.addEventListener('pushState', debouncedCheckAndAddFilter);
        window.addEventListener('replaceState', debouncedCheckAndAddFilter);

        const inboxContainer = document.querySelector('.InboxPage .SinglePaneScrollableContents');
        if (inboxContainer) {
            const taskObserver = new MutationObserver(() => {
                updateProjectList();
                filterTasks();
            });
            taskObserver.observe(inboxContainer, {
                childList: true,
                subtree: true
            });
        }

        const inboxFeed = document.querySelector('.InboxFeed');
        if (inboxFeed) {
            const archiveObserver = new MutationObserver(debounce(() => {
                updateProjectList();
                filterTasks();
            }, 500));
            archiveObserver.observe(inboxFeed, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    // Initialize the script when the page loads
    window.addEventListener('load', () => {
        observeDOM();
        debouncedCheckAndAddFilter();
    });
})();