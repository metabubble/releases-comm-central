/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "cal", "resource://calendar/modules/calUtils.jsm", "cal");

/*
 * View and DOM related helper functions
 */

// NOTE: This module should not be loaded directly, it is available when
// including calUtils.jsm under the cal.view namespace.

this.EXPORTED_SYMBOLS = ["calview"]; /* exported calview */

var calview = {
    /**
     * Checks if the mousepointer of an event resides over a XULBox during an event
     *
     * @param aMouseEvent   The event eg. a 'mouseout' or 'mousedown' event
     * @param aXULBox       The xul element
     * @return              true or false depending on whether the mouse pointer
     *                      resides over the xulelement
     */
    isMouseOverBox: function(aMouseEvent, aXULElement) {
        let boundingRect = aXULElement.getBoundingClientRect();
        let boxWidth = boundingRect.width;
        let boxHeight = boundingRect.height;
        let boxScreenX = aXULElement.screenX;
        let boxScreenY = aXULElement.screenY;
        let mouseX = aMouseEvent.screenX;
        let mouseY = aMouseEvent.screenY;
        let xIsWithin = (mouseX >= boxScreenX) &&
                        (mouseX <= (boxScreenX + boxWidth));
        let yIsWithin = (mouseY >= boxScreenY) &&
                        (mouseY <= (boxScreenY + boxHeight));
        return (xIsWithin && yIsWithin);
    },

    /**
     * Removes those childnodes from a node that contain a specified attribute
     * and where the value of this attribute matches a passed value
     *
     * @param aParentNode   The parent node that contains the child nodes in question
     * @param aAttribute    The name of the attribute
     * @param aAttribute    The value of the attribute
     */
    removeChildElementsByAttribute: function(aParentNode, aAttribute, aValue) {
        let childNode = aParentNode.lastChild;
        while (childNode) {
            let prevChildNode = childNode.previousSibling;
            if (!aAttribute || aAttribute === undefined) {
                childNode.remove();
            } else if (!aValue || aValue === undefined) {
                childNode.remove();
            } else if (childNode && childNode.hasAttribute(aAttribute) &&
                       childNode.getAttribute(aAttribute) == aValue) {
                childNode.remove();
            }
            childNode = prevChildNode;
        }
    },

    /**
     * Returns a parentnode - or the passed node - with the given localName, by
     * traversing up the DOM hierarchy.
     *
     * @param aChildNode  The childnode.
     * @param aLocalName  The localName of the to-be-returned parent
     *                      that is looked for.
     * @return            The parent with the given localName or the
     *                      given childNode 'aChildNode'. If no appropriate
     *                      parent node with aLocalName could be
     *                      retrieved it is returned 'null'.
     */
    getParentNodeOrThis: function(aChildNode, aLocalName) {
        let node = aChildNode;
        while (node && (node.localName != aLocalName)) {
            node = node.parentNode;
            if (node.tagName == undefined) {
                return null;
            }
        }
        return node;
    },

    /**
     * Returns a parentnode  - or the passed node -  with the given attribute
     * value for the given attributename by traversing up the DOM hierarchy.
     *
     * @param aChildNode      The childnode.
     * @param aAttibuteName   The name of the attribute that is to be compared with
     * @param aAttibuteValue  The value of the attribute that is to be compared with
     * @return                The parent with the given attributeName set that has
     *                          the same value as the given given attributevalue
     *                          'aAttributeValue'. If no appropriate
     *                          parent node can be retrieved it is returned 'null'.
     */
    getParentNodeOrThisByAttribute: function(aChildNode, aAttributeName, aAttributeValue) {
        let node = aChildNode;
        while (node && (node.getAttribute(aAttributeName) != aAttributeValue)) {
            node = node.parentNode;
            if (node.tagName == undefined) {
                return null;
            }
        }
        return node;
    },

    /**
     * Format the given string to work inside a CSS rule selector
     * (and as part of a non-unicode preference key).
     *
     * Replaces each space ' ' char with '_'.
     * Replaces each char other than ascii digits and letters, with '-uxHHH-'
     * where HHH is unicode in hexadecimal (variable length, terminated by the '-').
     *
     * Ensures: result only contains ascii digits, letters,'-', and '_'.
     * Ensures: result is invertible, so (f(a) = f(b)) implies (a = b).
     *   also means f is not idempotent, so (a != f(a)) implies (f(a) != f(f(a))).
     * Ensures: result must be lowercase.
     * Rationale: preference keys require 8bit chars, and ascii chars are legible
     *              in most fonts (in case user edits PROFILE/prefs.js).
     *            CSS class names in Gecko 1.8 seem to require lowercase,
     *              no punctuation, and of course no spaces.
     *   nmchar            [_a-zA-Z0-9-]|{nonascii}|{escape}
     *   name              {nmchar}+
     *   http://www.w3.org/TR/CSS21/grammar.html#scanner
     *
     * @param aString       The unicode string to format
     * @return              The formatted string using only chars [_a-zA-Z0-9-]
     */
    formatStringForCSSRule: function(aString) {
        function toReplacement(char) {
            // char code is natural number (positive integer)
            let nat = char.charCodeAt(0);
            switch (nat) {
                case 0x20: // space
                    return "_";
                default:
                    return "-ux" + nat.toString(16) + "-"; // lowercase
            }
        }
        // Result must be lowercase or style rule will not work.
        return aString.toLowerCase().replace(/[^a-zA-Z0-9]/g, toReplacement);
    },

    /**
     * Gets the cached instance of the composite calendar.
     *
     * @param aWindow       The window to get the composite calendar for.
     */
    getCompositeCalendar: function(aWindow) {
        if (typeof aWindow._compositeCalendar == "undefined") {
            let comp = aWindow._compositeCalendar = Cc["@mozilla.org/calendar/calendar;1?type=composite"]
                                                      .createInstance(Ci.calICompositeCalendar);
            comp.prefPrefix = "calendar-main";

            if (typeof aWindow.gCalendarStatusFeedback != "undefined") {
                // If we are in a window that has calendar status feedback, set
                // up our status observer.
                let chromeWindow = aWindow.QueryInterface(Ci.nsIDOMChromeWindow);
                comp.setStatusObserver(aWindow.gCalendarStatusFeedback, chromeWindow);
            }
        }
        return aWindow._compositeCalendar;
    },

    /**
     * Hash the given string into a color from the color palette of the standard
     * color picker.
     *
     * @param str           The string to hash into a color.
     * @return              The hashed color.
     */
    hashColor: function(str) {
        // This is the palette of colors in the current colorpicker implementation.
        // Unfortunately, there is no easy way to extract these colors from the
        // binding directly.
        const colorPalette = [
            "#FFFFFF", "#FFCCCC", "#FFCC99", "#FFFF99", "#FFFFCC",
            "#99FF99", "#99FFFF", "#CCFFFF", "#CCCCFF", "#FFCCFF",
            "#CCCCCC", "#FF6666", "#FF9966", "#FFFF66", "#FFFF33",
            "#66FF99", "#33FFFF", "#66FFFF", "#9999FF", "#FF99FF",
            "#C0C0C0", "#FF0000", "#FF9900", "#FFCC66", "#FFFF00",
            "#33FF33", "#66CCCC", "#33CCFF", "#6666CC", "#CC66CC",
            "#999999", "#CC0000", "#FF6600", "#FFCC33", "#FFCC00",
            "#33CC00", "#00CCCC", "#3366FF", "#6633FF", "#CC33CC",
            "#666666", "#990000", "#CC6600", "#CC9933", "#999900",
            "#009900", "#339999", "#3333FF", "#6600CC", "#993399",
            "#333333", "#660000", "#993300", "#996633", "#666600",
            "#006600", "#336666", "#000099", "#333399", "#663366",
            "#000000", "#330000", "#663300", "#663333", "#333300",
            "#003300", "#003333", "#000066", "#330099", "#330033"
        ];

        let sum = Array.from(str || " ", e => e.charCodeAt(0)).reduce((a, b) => a + b);
        return colorPalette[sum % colorPalette.length];
    },

    /**
     * Pick whichever of "black" or "white" will look better when used as a text
     * color against a background of bgColor.
     *
     * @param bgColor   the background color as a "#RRGGBB" string
     */
    getContrastingTextColor: function(bgColor) {
        let calcColor = bgColor.replace(/#/g, "");
        let red = parseInt(calcColor.substring(0, 2), 16);
        let green = parseInt(calcColor.substring(2, 4), 16);
        let blue = parseInt(calcColor.substring(4, 6), 16);

        // Calculate the brightness (Y) value using the YUV color system.
        let brightness = (0.299 * red) + (0.587 * green) + (0.114 * blue);

        // Consider all colors with less than 56% brightness as dark colors and
        // use white as the foreground color, otherwise use black.
        if (brightness < 144) {
            return "white";
        }

        return "black";
    },

    /**
      * Item comparator for inserting items into dayboxes.
      *
      * @param a     The first item
      * @param b     The second item
      * @return      The usual -1, 0, 1
      */
    compareItems: function(a, b) {
        if (!a) {
            return -1;
        }
        if (!b) {
            return 1;
        }

        let aIsEvent = cal.item.isEvent(a);
        let aIsTodo = cal.item.isToDo(a);

        let bIsEvent = cal.item.isEvent(b);
        let bIsTodo = cal.item.isToDo(b);

        // sort todos before events
        if (aIsTodo && bIsEvent) {
            return -1;
        }
        if (aIsEvent && bIsTodo) {
            return 1;
        }

        // sort items of the same type according to date-time
        let aStartDate = a.startDate || a.entryDate || a.dueDate;
        let bStartDate = b.startDate || b.entryDate || b.dueDate;
        let aEndDate = a.endDate || a.dueDate || a.entryDate;
        let bEndDate = b.endDate || b.dueDate || b.entryDate;
        if (!aStartDate || !bStartDate) {
            return 0;
        }

        // sort all day events before events with a duration
        if (aStartDate.isDate && !bStartDate.isDate) {
            return -1;
        }
        if (!aStartDate.isDate && bStartDate.isDate) {
            return 1;
        }

        let cmp = aStartDate.compare(bStartDate);
        if (cmp != 0) {
            return cmp;
        }

        if (!aEndDate || !bEndDate) {
            return 0;
        }
        cmp = aEndDate.compare(bEndDate);
        if (cmp != 0) {
            return cmp;
        }

        cmp = (a.title > b.title) - (a.title < b.title);
        return cmp;
    }
};

/**
 * Adds CSS variables for each calendar to registered windows for coloring
 * UI elements. Automatically tracks calendar creation, changes, and deletion.
 */
calview.colorTracker = {
    calendars: null,
    categoryBranch: null,
    windows: new Set(),
    QueryInterface: cal.generateQI([
        Ci.calICalendarManagerObserver,
        Ci.calIObserver
    ]),

    // The only public method. Deregistration is not required.
    registerWindow(aWindow) {
        if (this.calendars === null) {
            let manager = cal.getCalendarManager();
            this.calendars = new Set(manager.getCalendars({}));
            manager.addObserver(this);
            manager.addCalendarObserver(this);
            this.categoryBranch = Services.prefs.getBranch("calendar.category.color.");
            this.categoryBranch.addObserver("", this);
            Services.obs.addObserver(this, "xpcom-shutdown");
        }

        this.windows.add(aWindow);
        aWindow.addEventListener("unload", () => this.windows.delete(aWindow));
        for (let calendar of this.calendars) {
            this._addCalendarToWindow(aWindow, calendar);
        }
        this._addAllCategoriesToWindow(aWindow);
    },
    _addCalendarToWindow(aWindow, aCalendar) {
        let cssSafeId = calview.formatStringForCSSRule(aCalendar.id);
        let style = aWindow.document.documentElement.style;
        let backColor = aCalendar.getProperty("color") || "#a8c2e1";
        let foreColor = calview.getContrastingTextColor(backColor);
        style.setProperty(`--calendar-${cssSafeId}-backcolor`, backColor);
        style.setProperty(`--calendar-${cssSafeId}-forecolor`, foreColor);
    },
    _removeCalendarFromWindow(aWindow, aCalendar) {
        let cssSafeId = calview.formatStringForCSSRule(aCalendar.id);
        let style = aWindow.document.documentElement.style;
        style.removeProperty(`--calendar-${cssSafeId}-backcolor`);
        style.removeProperty(`--calendar-${cssSafeId}-forecolor`);
    },
    _addCategoryToWindow(aWindow, aCategoryName) {
        if (/[^\w-]/.test(aCategoryName)) {
            return;
        }

        let cssSafeName = calview.formatStringForCSSRule(aCategoryName);
        let style = aWindow.document.documentElement.style;
        let color = this.categoryBranch.getStringPref(aCategoryName, "transparent");
        style.setProperty(`--category-${cssSafeName}-color`, color);
    },
    _addAllCategoriesToWindow(aWindow) {
        for (let categoryName of this.categoryBranch.getChildList("")) {
            this._addCategoryToWindow(aWindow, categoryName);
        }
    },

    // calICalendarManagerObserver methods
    onCalendarRegistered(aCalendar) {
        this.calendars.add(aCalendar);
        for (let window of this.windows) {
            this._addCalendarToWindow(window, aCalendar);
        }
    },
    onCalendarUnregistering(aCalendar) {
        this.calendars.delete(aCalendar);
        for (let window of this.windows) {
            this._removeCalendarFromWindow(window, aCalendar);
        }
    },
    onCalendarDeleting(aCalendar) {},

    // calIObserver methods
    onStartBatch() {},
    onEndBatch() {},
    onLoad() {},
    onAddItem(aItem) {},
    onModifyItem(aNewItem, aOldItem) {},
    onDeleteItem(aDeletedItem) {},
    onError(aCalendar, aErrNo, aMessage) {},
    onPropertyChanged(aCalendar, aName, aValue, aOldValue) {
        if (aName == "color") {
            for (let window of this.windows) {
                this._addCalendarToWindow(window, aCalendar);
            }
        }
    },
    onPropertyDeleting(aCalendar, aName) {},

    // nsIObserver method
    observe(aSubject, aTopic, aData) {
        if (aTopic == "nsPref:changed") {
            for (let window of this.windows) {
                this._addCategoryToWindow(window, aData);
            }
            // TODO Currently, the only way to find out if categories are removed is
            // to initially grab the calendar.categories.names preference and then
            // observe changes to it. It would be better if we had hooks for this.
        } else if (aTopic == "xpcom-shutdown") {
            this.categoryBranch.removeObserver("", this);
            Services.obs.removeObserver(this, "xpcom-shutdown");
        }
    }
};
