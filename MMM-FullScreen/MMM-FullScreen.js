Module.register("MMM-FullScreen", {
    defaults: {
        buttonText: "Go Fullscreen"
    },

    start: function () {
        console.log("MMM-Fullscreen started!");
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        wrapper.id = "fullscreen-button-wrapper";
        wrapper.style.display = this.isFullscreen() ? "none" : "block";

        const button = document.createElement("button");
        button.innerHTML = this.config.buttonText;
        button.id = "fullscreen-button";
        button.style.cursor = "pointer";
        button.onclick = () => this.requestFullscreen();

        wrapper.appendChild(button);
        return wrapper;
    },

    notificationReceived: function (notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            this.addFullscreenChangeListener();
        }
    },

    requestFullscreen: function () {
        const elem = document.documentElement; // Get the full page element
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // Chrome, Safari, and Opera
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        } else {
            console.warn("Fullscreen API is not supported in this browser.");
        }
    },

    isFullscreen: function () {
        // Check if window and screen dimensions match
        return window.innerHeight === screen.height && window.innerWidth === screen.width;
    },

    addFullscreenChangeListener: function () {
        // Use the window resize event to detect changes
        window.addEventListener("resize", () => this.updateButtonVisibility());
    },

    updateButtonVisibility: function () {
        const wrapper = document.getElementById("fullscreen-button-wrapper");
        if (wrapper) {
            wrapper.style.display = this.isFullscreen() ? "none" : "block";
        }
    },

    getStyles: function () {
        return ["MMM-FullScreen.css"];
    }
});
