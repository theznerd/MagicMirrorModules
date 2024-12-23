Module.register("MMM-Screensaver", {
    defaults: {
        idleTimeout: 300, // Idle timeout in seconds
        slideshowInterval: 10000, // Time between slides in milliseconds
        photos: [], // List of photos
    },

    start: function () {
        this.lastInteraction = Date.now();
        this.currentPhotoIndex = 0;
        this.isIdle = false;
        this.wrapper = null;
        this.transitionTimeout = null;

        Log.info("MMM-Screensaver: Module started.");
        this.preloadImages();

        // Listen for user interaction
        document.addEventListener("touchstart", this.resetIdleTimer.bind(this));
        document.addEventListener("mousemove", this.resetIdleTimer.bind(this));
        document.addEventListener("click", this.resetIdleTimer.bind(this));

        // Check for idle status periodically
        setInterval(() => this.checkIdleStatus(), 1000);
    },

    preloadImages: function () {
        this.preloadedImages = [];
        this.config.photos.forEach((photoPath) => {
            const img = new Image();
            img.src = photoPath;
            this.preloadedImages.push(img);
        });
    },

    getDom: function () {
        if (!this.wrapper) {
            // Create the wrapper element once
            this.wrapper = document.createElement("div");
            this.wrapper.style.position = "fixed";
            this.wrapper.style.top = "0";
            this.wrapper.style.left = "0";
            this.wrapper.style.width = "100vw";
            this.wrapper.style.height = "100vh";
            this.wrapper.style.overflow = "hidden";
            this.wrapper.style.zIndex = "-1"; // Ensure it's not above everything
            this.wrapper.style.display = "none"; // Initially hidden
            this.wrapper.style.backgroundColor = "black"; // Add solid background color

            // Add all images to the wrapper
            this.config.photos.forEach((photoPath, index) => {
                const photo = document.createElement("img");
                photo.src = photoPath;
                photo.className = "fullscreen-photo";
                if (index === this.currentPhotoIndex) {
                    photo.classList.add("visible");
                }
                this.wrapper.appendChild(photo);
            });

            // Append the wrapper to the MagicMirror² DOM
            document.body.appendChild(this.wrapper);
        }
        return document.createElement("div"); // Empty element for the MagicMirror slot
    },

    transitionToNextPhoto: function () {
        const photos = this.wrapper.querySelectorAll(".fullscreen-photo");

        if (photos.length > 0) {
            const previousIndex = this.currentPhotoIndex;
            this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.config.photos.length;

            // Add 'fading-out' class to the previous photo
            photos[previousIndex].classList.add("fading-out");
            photos[previousIndex].classList.remove("visible");

            // Remove 'fading-out' class after the transition ends
            setTimeout(() => {
                photos[previousIndex].classList.remove("fading-out");
            }, 1000); // Match the CSS transition duration

            // Add 'visible' class to the next photo
            photos[this.currentPhotoIndex].classList.add("visible");
        }

        // Schedule the next transition
        this.transitionTimeout = setTimeout(() => this.transitionToNextPhoto(), this.config.slideshowInterval);
    },

    checkIdleStatus: function () {
        const idleTime = (Date.now() - this.lastInteraction) / 1000; // Calculate idle time in seconds

        if (idleTime > this.config.idleTimeout && !this.isIdle) {
            this.isIdle = true;
            this.wrapper.style.display = "block"; // Show the slideshow
            this.wrapper.style.zIndex = "1"; // Bring slideshow to the front
            this.transitionToNextPhoto(); // Start the slideshow
        } else if (idleTime <= this.config.idleTimeout && this.isIdle) {
            this.isIdle = false;
            this.wrapper.style.display = "none"; // Hide the slideshow
            clearTimeout(this.transitionTimeout); // Stop the slideshow
        }
    },

    resetIdleTimer: function () {
        this.lastInteraction = Date.now();

        if (this.isIdle) {
            this.isIdle = false;
            this.wrapper.style.display = "none"; // Hide the slideshow
            clearTimeout(this.transitionTimeout); // Stop the slideshow
        }
    },

    getStyles: function () {
        return ["MMM-Screensaver.css"];
    }
});