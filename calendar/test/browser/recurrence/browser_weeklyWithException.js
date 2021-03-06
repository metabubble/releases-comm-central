/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var {
  CALENDARNAME,
  CANVAS_BOX,
  DAY_VIEW,
  EVENTPATH,
  EVENT_BOX,
  WEEK_VIEW,
  closeAllEventDialogs,
  controller,
  createCalendar,
  deleteCalendars,
  goToDate,
  handleOccurrencePrompt,
  helpersForController,
  invokeNewEventDialog,
  invokeEditingRepeatEventDialog,
  menulistSelect,
  switchToView,
  viewForward,
} = ChromeUtils.import("resource://testing-common/mozmill/CalendarUtils.jsm");
var { saveAndCloseItemDialog, setData } = ChromeUtils.import(
  "resource://testing-common/mozmill/ItemEditingHelpers.jsm"
);

var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

var { lookup, lookupEventBox } = helpersForController(controller);

const HOUR = 8;
const STARTDATE = cal.createDateTime("20090106T000000Z");
const TITLE = "Event";

add_task(async function testWeeklyWithExceptionRecurrence() {
  createCalendar(controller, CALENDARNAME);
  switchToView(controller, "day");
  goToDate(controller, 2009, 1, 5);

  // Create weekly recurring event.
  let eventBox = lookupEventBox("day", CANVAS_BOX, null, 1, HOUR);
  await invokeNewEventDialog(controller, eventBox, async (eventWindow, iframeWindow) => {
    await setData(eventWindow, iframeWindow, { title: TITLE, repeat: setRecurrence });
    saveAndCloseItemDialog(eventWindow);
  });

  // Move 5th January occurrence to 6th January.
  eventBox = lookupEventBox("day", EVENT_BOX, null, 1, null, EVENTPATH);
  await invokeEditingRepeatEventDialog(controller, eventBox, async (eventWindow, iframeWindow) => {
    await setData(eventWindow, iframeWindow, {
      title: TITLE,
      startdate: STARTDATE,
      enddate: STARTDATE,
    });
    saveAndCloseItemDialog(eventWindow);
  });

  // Change recurrence rule.
  goToDate(controller, 2009, 1, 7);
  eventBox = lookupEventBox("day", EVENT_BOX, null, 1, null, EVENTPATH);
  await invokeEditingRepeatEventDialog(
    controller,
    eventBox,
    async (eventWindow, iframeWindow) => {
      await setData(eventWindow, iframeWindow, { title: "Event", repeat: changeRecurrence });
      saveAndCloseItemDialog(eventWindow);
    },
    true
  );

  // Check two weeks.
  // day view
  switchToView(controller, "day");
  let path = lookupEventBox("day", EVENT_BOX, null, 1, null, EVENTPATH);

  goToDate(controller, 2009, 1, 5);
  controller.waitForElementNotPresent(path);

  viewForward(controller, 1);
  let tuesPath = `
        ${DAY_VIEW}/{"class":"mainbox"}/{"class":"scrollbox"}/
        {"class":"daybox"}/[0]/{"class":"multiday-column-box-stack"}/
        {"class":"multiday-column-top-box"}/{"flex":"1"}/{"flex":"1"}/[eventIndex]
    `;

  // Assert exactly two.
  controller.waitForElement(lookup(tuesPath.replace("eventIndex", "0") + EVENTPATH));
  Assert.ok(lookup(tuesPath.replace("eventIndex", "1") + EVENTPATH).exists());
  Assert.ok(!lookup(tuesPath.replace("eventIndex", "2") + EVENTPATH).exists());

  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElementNotPresent(path);
  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElementNotPresent(path);
  viewForward(controller, 1);
  controller.waitForElementNotPresent(path);

  // next week
  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElementNotPresent(path);
  viewForward(controller, 1);
  controller.waitForElement(path);
  viewForward(controller, 1);
  controller.waitForElementNotPresent(path);

  // week view
  switchToView(controller, "week");
  goToDate(controller, 2009, 1, 5);

  tuesPath = `
        ${WEEK_VIEW}/{"class":"mainbox"}/{"class":"scrollbox"}/
        {"class":"daybox"}/[2]/{"class":"multiday-column-box-stack"}/
        {"class":"multiday-column-top-box"}/{"flex":"1"}/{"flex":"1"}/[eventIndex]
    `;

  // Assert exactly two.
  controller.waitForElement(lookup(tuesPath.replace("eventIndex", "0") + EVENTPATH));
  Assert.ok(lookup(tuesPath.replace("eventIndex", "1") + EVENTPATH).exists());
  Assert.ok(!lookup(tuesPath.replace("eventIndex", "2") + EVENTPATH).exists());

  // Wait for the last occurrence because this appears last.
  controller.waitForElement(lookupEventBox("week", EVENT_BOX, null, 6, null));
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 1, null).exists());
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 2, null).exists());
  Assert.ok(lookupEventBox("week", EVENT_BOX, null, 4, null).exists());
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 5, null).exists());
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 7, null).exists());

  viewForward(controller, 1);
  controller.waitForElement(lookupEventBox("week", EVENT_BOX, null, 6, null));
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 1, null).exists());
  Assert.ok(lookupEventBox("week", EVENT_BOX, null, 2, null).exists());
  Assert.ok(lookupEventBox("week", EVENT_BOX, null, 3, null).exists());
  Assert.ok(lookupEventBox("week", EVENT_BOX, null, 4, null).exists());
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 5, null).exists());
  Assert.ok(!lookupEventBox("week", EVENT_BOX, null, 7, null).exists());

  // multiweek view
  switchToView(controller, "multiweek");
  goToDate(controller, 2009, 1, 5);
  checkMultiWeekView("multiweek");

  // month view
  switchToView(controller, "month");
  checkMultiWeekView("month");

  // Delete event.
  switchToView(controller, "day");
  goToDate(controller, 2009, 1, 12);
  path = lookupEventBox("day", EVENT_BOX, null, 1, null, EVENTPATH);
  controller.click(path);
  handleOccurrencePrompt(controller, path, "delete", true);
  controller.waitForElementNotPresent(path);

  Assert.ok(true, "Test ran to completion");
});

async function setRecurrence(recurrenceWindow) {
  let recurrenceDocument = recurrenceWindow.document;

  // weekly
  await menulistSelect(recurrenceDocument.getElementById("period-list"), "1");

  let mon = cal.l10n.getDateFmtString("day.2.Mmm");
  let wed = cal.l10n.getDateFmtString("day.4.Mmm");
  let fri = cal.l10n.getDateFmtString("day.6.Mmm");

  let dayPicker = recurrenceDocument.getElementById("daypicker-weekday");

  // Starting from Monday so it should be checked.
  Assert.ok(dayPicker.querySelector(`[label="${mon}"]`).checked, "mon checked");

  // Check Wednesday and Friday too.
  EventUtils.synthesizeMouseAtCenter(
    dayPicker.querySelector(`[label="${wed}"]`),
    {},
    recurrenceWindow
  );
  Assert.ok(dayPicker.querySelector(`[label="${wed}"]`).checked, "wed checked");
  EventUtils.synthesizeMouseAtCenter(
    dayPicker.querySelector(`[label="${fri}"]`),
    {},
    recurrenceWindow
  );
  Assert.ok(dayPicker.querySelector(`[label="${fri}"]`).checked, "fri checked");

  // Close dialog.
  EventUtils.synthesizeMouseAtCenter(
    recurrenceDocument.querySelector("dialog").getButton("accept"),
    {},
    recurrenceWindow
  );
}

async function changeRecurrence(recurrenceWindow) {
  let recurrenceDocument = recurrenceWindow.document;

  // weekly
  await menulistSelect(recurrenceDocument.getElementById("period-list"), "1");

  let mon = cal.l10n.getDateFmtString("day.2.Mmm");
  let tue = cal.l10n.getDateFmtString("day.3.Mmm");
  let wed = cal.l10n.getDateFmtString("day.4.Mmm");
  let fri = cal.l10n.getDateFmtString("day.6.Mmm");

  let dayPicker = recurrenceDocument.getElementById("daypicker-weekday");

  // Check old rule.
  // Starting from Monday so it should be checked.
  Assert.ok(dayPicker.querySelector(`[label="${mon}"]`).checked, "mon checked");
  Assert.ok(dayPicker.querySelector(`[label="${wed}"]`).checked, "wed checked");
  Assert.ok(dayPicker.querySelector(`[label="${fri}"]`).checked, "fri checked");

  // Check Tuesday.
  EventUtils.synthesizeMouseAtCenter(
    dayPicker.querySelector(`[label="${tue}"]`),
    {},
    recurrenceWindow
  );
  Assert.ok(dayPicker.querySelector(`[label="${tue}"]`).checked, "tue checked");

  // Close dialog.
  EventUtils.synthesizeMouseAtCenter(
    recurrenceDocument.querySelector("dialog").getButton("accept"),
    {},
    recurrenceWindow
  );
}

function checkMultiWeekView(view) {
  let startWeek = view == "multiweek" ? 1 : 2;
  let assertNodeLookup = (...args) => {
    return Assert.ok(lookupEventBox(...args).exists());
  };
  let assertNodeNotExistLookup = (...args) => {
    return Assert.ok(!lookupEventBox(...args).exists());
  };

  // Wait for the first items, then check the ones not to be present.
  // Assert exactly two.
  controller.waitForElement(lookupEventBox(view, EVENT_BOX, startWeek, 3, null, "/[0]"));
  assertNodeLookup(view, CANVAS_BOX, startWeek, 3, null, "/[1]");
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek, 3, null, "/[2]");
  // Then check no item on the 5th.
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek, 2, null, EVENTPATH);
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek, 3, null, "/[2]");
  assertNodeLookup(view, CANVAS_BOX, startWeek, 4, null, EVENTPATH);
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek, 5, null, EVENTPATH);
  assertNodeLookup(view, CANVAS_BOX, startWeek, 6, null, EVENTPATH);
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek, 7, null, EVENTPATH);

  assertNodeNotExistLookup(view, EVENT_BOX, startWeek + 1, 1, null, EVENTPATH);
  assertNodeLookup(view, CANVAS_BOX, startWeek + 1, 2, null, EVENTPATH);
  assertNodeLookup(view, CANVAS_BOX, startWeek + 1, 3, null, EVENTPATH);
  assertNodeLookup(view, CANVAS_BOX, startWeek + 1, 4, null, EVENTPATH);
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek + 1, 5, null, EVENTPATH);
  assertNodeLookup(view, CANVAS_BOX, startWeek + 1, 6, null, EVENTPATH);
  assertNodeNotExistLookup(view, EVENT_BOX, startWeek + 1, 7, null, EVENTPATH);
}

registerCleanupFunction(function teardownModule() {
  deleteCalendars(controller, CALENDARNAME);
  closeAllEventDialogs();
});
