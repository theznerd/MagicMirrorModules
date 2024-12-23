const NodeHelper = require("node_helper");
const axios = require("axios");
const Log = require("logger");

module.exports = NodeHelper.create({
    start: function () {
        console.log("Starting node_helper for MMM-VikunjaTasks");
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "GET_VIKUNJA_TASKS") {
            this.getTasks(payload);
        } else if (notification === "MARK_TASK_COMPLETE") {
            this.completeTask(payload);
        }
    },

    async getTasks({ identifier, config, startOfWeek, endOfWeek }) {
        try {
            const response = await axios.get(`${config.apiUrl}/projects/${config.projectId}/views/${config.viewId}/tasks`, {
                headers: { Authorization: `Bearer ${config.token}` },
                params: { },
            });
    
            this.sendSocketNotification("VIKUNJA_TASKS", {
                identifier, // Include identifier to ensure correct instance receives the data
                tasks: response.data
            });
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    },

    async completeTask({ config, taskId }) {
        try {
            await axios.post(
                `${config.apiUrl}/tasks/${taskId}`,
                { done: true },
                { headers: { Authorization: `Bearer ${config.token}` } }
            );
        } catch (error) {
            console.error("Error marking task complete:", error);
        }
    },
});
