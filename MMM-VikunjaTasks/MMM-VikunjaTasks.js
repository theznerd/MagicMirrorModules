Module.register("MMM-VikunjaTasks", {
    defaults: {
        apiUrl: "",             // Vikunja instance base URL
        title: "Tasks",         // Plural title prepend ("**Tasks** for MM/DD/YYYY - MM/DD/YYYY")
        token: "",              // Vikunja API Key
        projectId: "",          // Project ID to pull tasks from
        viewId: "",             // The View ID of the Project to pull tasks from
        refreshInterval: 10000, // The interval in MS that the system refreshes tasks
        groupByDay: true,
    },

    start: function () {
        this.tasks = [];
        this.filteredLabel = null; // For filtering by label
        this.savedScrollTop = 0; // Initialize scroll position
        this.getData();
        this.timers = {}; // Initialize timers object
        this.preventRefresh = false; // To prevent getData from running
        this.getData();
        setInterval(() => {
            if (!this.preventRefresh) {
                this.getData();
            }
        }, this.config.refreshInterval);
    },

    getStyles: function () {
        return ["MMM-VikunjaTasks.css"];
    },

    getData: function () {
        const startOfWeek = this.getSunday(new Date());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
    
        const startISO = startOfWeek.toISOString();
        const endISO = endOfWeek.toISOString();
    
        this.sendSocketNotification("GET_VIKUNJA_TASKS", {
            identifier: this.identifier, // Pass unique identifier
            config: this.config,
            startOfWeek: startISO,
            endOfWeek: endISO,
        });
    
        console.log("Requesting Vikunja Tasks");
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "VIKUNJA_TASKS" && payload.identifier === this.identifier) {
            // Save scroll position
            const scrollableContainer = document.querySelector(`.scrollable-container[data-instance="${this.identifier}"]`);
            this.savedScrollTop = scrollableContainer ? scrollableContainer.scrollTop : 0;
    
            // Update tasks and DOM
            payload.tasks = payload.tasks.filter(task => {
                if (task.due_date === "0001-01-01T00:00:00Z") return true; // Keep tasks with no due date
                const dueDate = new Date(task.due_date);
                const oneWeekFromNow = new Date();
                oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
                return dueDate <= oneWeekFromNow; // Keep tasks due within a week
            });
    
            this.tasks = payload.tasks;
            this.labelColors = payload.labelColors;
    
            this.updateDom(); // Trigger DOM update
        }
    },

    getDom: function () {
        const wrapper = document.createElement("div");
    
        // Title
        const startOfWeek = this.getSunday(new Date());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
    
        wrapper.innerHTML = `<div class="vikunjatasks-title">${this.config.title} for ${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}</div>`;
    
        // Scrollable Container
        const scrollableContainer = document.createElement("div");
        scrollableContainer.className = "scrollable-container";
        scrollableContainer.setAttribute("data-instance", this.identifier); // Add instance-specific attribute    

        if (this.tasks && this.tasks.length > 0) {
            // Group and sort tasks by due date
            if(this.config.groupByDay){
                const groupedTasks = this.groupTasksByDate(this.tasks);

                Object.keys(groupedTasks).forEach((group) => {
                    // Add a separator for each group
                    const separator = document.createElement("div");
                    separator.className = "task-separator";
                    separator.textContent = group;
                    scrollableContainer.appendChild(separator);

                    // Add tasks for this group
                    groupedTasks[group].forEach((task) => {
                        const taskCardHTML = this.getTaskCardTemplate(task);
                        const taskCard = document.createElement("div");
                        taskCard.innerHTML = taskCardHTML;

                        // Attach event listener to the checkbox
                        const checkbox = taskCard.querySelector(".task-checkbox");
                        checkbox.addEventListener("change", () => this.handleCheckboxChange(task.id, checkbox.checked));

                        scrollableContainer.appendChild(taskCard);
                    });
                });
            } else {
                this.tasks.forEach((task) => {
                    const taskCardHTML = this.getTaskCardTemplate(task);
                    const taskCard = document.createElement("div");
                    taskCard.innerHTML = taskCardHTML;

                    // Attach event listener to the checkbox
                    const checkbox = taskCard.querySelector(".task-checkbox");
                    checkbox.addEventListener("change", () => this.handleCheckboxChange(task.id, checkbox.checked));

                    scrollableContainer.appendChild(taskCard);
                });
            }
        } else {
            const noTasksMessage = document.createElement("div");
            noTasksMessage.className = "no-tasks-message";
            noTasksMessage.textContent = `Yippee! No ${this.config.title} remain for the week!`;
            scrollableContainer.appendChild(noTasksMessage);
        }

        // Append the scrollable container
        wrapper.appendChild(scrollableContainer);

        // Restore scroll position with a delay
        setTimeout(() => {
            if (this.savedScrollTop) {
                console.log("Restoring scrollTop after delay:", this.savedScrollTop);
                scrollableContainer.scrollTop = this.savedScrollTop;
            }
        }, 0);

        return wrapper;
    },
    
    groupTasksByDate: function (tasks) {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        // Helper function to format the date into a group key
        const formatDateKey = (date) => {
            if (date == "0001-01-01T00:00:00Z") return "No Date";

            const taskDate = new Date(date);
            if (taskDate.toDateString() === today.toDateString()) {
                return "Today";
            } else if (taskDate.toDateString() === tomorrow.toDateString()) {
                return "Tomorrow";
            } else {
                return daysOfWeek[taskDate.getDay()];
            }
        };

        // Helper function to determine the sorting weight of each group
        const getGroupWeight = (group) => {
            if (group === "Today") return 0;
            if (group === "Tomorrow") return 1;
            if (daysOfWeek.includes(group)) return 2 + daysOfWeek.indexOf(group);
            return Infinity; // "No Due Date" goes last
        };

        // Group tasks by their formatted date key
        const groupedTasks = {};
        tasks.forEach((task) => {
            const groupKey = formatDateKey(task.due_date);
            if (!groupedTasks[groupKey]) {
                groupedTasks[groupKey] = [];
            }
            groupedTasks[groupKey].push(task);
        });

        // Sort groups by their weights
        const sortedGroups = Object.keys(groupedTasks).sort((a, b) => getGroupWeight(a) - getGroupWeight(b));

        // Return sorted groups with their tasks
        return sortedGroups.reduce((sorted, group) => {
            sorted[group] = groupedTasks[group];
            return sorted;
        }, {});
    },

    handleCheckboxChange: function (taskId, isChecked) {
        console.log("Timers object:", this.timers);
        console.log("Task ID:", taskId, "Checked:", isChecked);
    
        if (isChecked) {
            console.log(`Checkbox for task ${taskId} checked. Starting timer.`);
            this.preventRefresh = true; // Prevent getData from running
            if (this.timers[taskId]) {
                clearTimeout(this.timers[taskId]); // Clear any existing timer
            }
    
            // Set a new timer for 5 seconds
            this.timers[taskId] = setTimeout(() => {
                console.log(`Timer expired for task ${taskId}. Marking complete.`);
                this.markTaskComplete(taskId);
                delete this.timers[taskId]; // Remove the timer
    
                // Check if all timers are cleared
                if (Object.keys(this.timers).length === 0) {
                    console.log("All timers cleared. Allowing refresh.");
                    this.preventRefresh = false;
                    this.getData(); // Trigger a data refresh
                }
            }, 5000);
        } else {
            console.log(`Checkbox for task ${taskId} unchecked. Canceling timer.`);
            if (this.timers[taskId]) {
                clearTimeout(this.timers[taskId]); // Cancel the timer
                delete this.timers[taskId];
            }
    
            // Check if all timers are cleared
            if (Object.keys(this.timers).length === 0) {
                console.log("All timers cleared. Allowing refresh.");
                this.preventRefresh = false;
            }
        }
    },
    

    getTaskCardTemplate: function (task) {
        // Create the card as a string template
        const labels = task.labels ? task.labels
            .map(
                (label) =>
                    `<span class="label" style="background-color: #${label.hex_color || "ccc"}">${label.title}</span>`
            )
            .join("") : [];
    
        const dueDate = (task.due_date && task.due_date != "0001-01-01T00:00:00Z")
            ? `<p class="due-date">Due: ${new Date(task.due_date).toLocaleDateString()}</p>` : "";
    
        return `
            <div class="task-card">
                <table>
                    <td width="10%">
                        <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" />
                    </td>
                    <td>
                        <div class="task-title">${task.title}</div>
                        <div class="labels">${labels}</div>
                    </td>
                    <td width="25%">
                        <div class="task-due">${dueDate}</div>
                    </td>
                </table>
            </div>
        `;
    },

    markTaskComplete: function (taskId) {
        console.log(`Marking task ${taskId} as complete.`);
        this.sendSocketNotification("MARK_TASK_COMPLETE", {
            config: this.config,
            taskId,
        });
    
        // If no other timers are active, trigger a data refresh
        if (Object.keys(this.timers).length === 0) {
            console.log("All tasks processed. Triggering data refresh.");
            this.getData();
        }
    },

    getSunday: function (date) {
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    }
});
