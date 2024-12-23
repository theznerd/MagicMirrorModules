/**
 * Magic Mirror² Module: MMM-DayAtAGlance
 */
Module.register("MMM-DayAtAGlance", {
  defaults: {
    labelColors: {}, // Object to map names to specific colors {"John": "#FF0000", "Doe": "#00FF00"}
    updateInterval: 60000, // Update interval in ms (default: 1 minute)
  },

  start() {
    console.log("MMM-DayAtAGlance started.");
    this.events = [];
    this.updateDom();
    this.sendSocketNotification("CALENDAR_EVENTS_REQUEST", {});
  },

  getStyles() {
    return ["MMM-DayAtAGlance.css"]; // Add a CSS file for styling
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification === "CALENDAR_EVENTS") {
      console.log("Received CALENDAR_EVENTS:", payload); // Log the received events
      this.events = this.parseCalendarData(payload);
      this.updateDom();
    }
  },

  parseCalendarData(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filteredEvents = events.filter((event) => {
      const eventStart = new Date(parseInt(event.startDate));
      const eventEnd = new Date(parseInt(event.endDate));
      return (
        (eventStart >= today && eventStart < tomorrow) ||
        (eventEnd >= today && eventEnd < tomorrow) ||
        (eventStart <= today && eventEnd >= tomorrow)
      );
    });

    console.log("Filtered events for today:", filteredEvents); // Log filtered events
    return filteredEvents.sort((a, b) => parseInt(a.startDate) - parseInt(b.startDate));
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "day-at-a-glance";
    wrapper.style.overflowY = "auto";
    wrapper.style.maxHeight = "40vh";

    const header = document.createElement("header");
    header.className = "module-header";
    header.innerHTML = "Day at a Glance";
    wrapper.appendChild(header);

    if (this.events.length === 0) {
      const noEvents = document.createElement("p");
      noEvents.innerHTML = "No events for today.";
      wrapper.appendChild(noEvents);
      return wrapper;
    }

    this.events.forEach((event) => {
      const card = document.createElement("div");
      card.className = "event-card";

      const title = document.createElement("div");
      title.className = "event-title";
      title.innerText = event.title;
      card.appendChild(title);

      const time = document.createElement("div");
      time.className = "event-time";
      time.innerText = event.fullDayEvent ? "All day" : this.formatTime(event.startDate);
      card.appendChild(time);

      const labels = document.createElement("div");
      labels.className = "event-labels";
      if (event.description) {
        const peopleSection = event.description.match(/PEOPLE:\s*(.*)/);
        if (peopleSection) {
          peopleSection[1].split(",").forEach((name) => {
            const label = document.createElement("span");
            label.className = "label";
            label.innerText = name.trim();
            const color = this.config.labelColors[name.trim()] || "#FFFFFF";
            label.style.backgroundColor = color;
            label.style.color = this.getContrastingColor(color);
            labels.appendChild(label);
          });
        }
      }
      card.appendChild(labels);

      wrapper.appendChild(card);
    });

    return wrapper;
  },

  formatTime(timestamp) {
    const options = { hour: "2-digit", minute: "2-digit" };
    return new Date(parseInt(timestamp)).toLocaleTimeString([], options);
  },

  getContrastingColor(hex) {
    const rgb = parseInt(hex.slice(1), 16); // Convert hex to RGB
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const contrast = (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? "#000000" : "#FFFFFF";
    return contrast;
  },
});
