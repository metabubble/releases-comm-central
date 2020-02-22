/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

add_task(async () => {
  let account = createAccount();
  addIdentity(account);
  let rootFolder = account.incomingServer.rootFolder;

  window.gFolderTreeView.selectFolder(rootFolder);
  await new Promise(resolve => executeSoon(resolve));

  let extension = ExtensionTestUtils.loadExtension({
    background: async () => {
      async function checkProperty(property, expectedDefault, ...expected) {
        browser.test.log(
          `${property}: ${expectedDefault}, ${expected.join(", ")}`
        );

        browser.test.assertEq(
          expectedDefault,
          await browser.composeAction[property]({})
        );
        for (let i = 0; i < 3; i++) {
          browser.test.assertEq(
            expected[i],
            await browser.composeAction[property]({ tabId: tabIDs[i] })
          );
        }

        await new Promise(resolve => {
          browser.test.onMessage.addListener(function listener() {
            browser.test.onMessage.removeListener(listener);
            resolve();
          });
          browser.test.sendMessage("checkProperty", property, expected);
        });
      }

      await browser.compose.beginNew();
      await browser.compose.beginNew();
      await browser.compose.beginNew();
      let windows = await browser.windows.getAll({
        populate: true,
        windowTypes: ["messageCompose"],
      });
      let tabIDs = windows.map(w => w.tabs[0].id);

      await checkProperty("isEnabled", true, true, true, true);
      await browser.composeAction.disable();
      await checkProperty("isEnabled", false, false, false, false);
      await browser.composeAction.enable(tabIDs[0]);
      await checkProperty("isEnabled", false, true, false, false);
      await browser.composeAction.enable();
      await checkProperty("isEnabled", true, true, true, true);
      await browser.composeAction.disable();
      await checkProperty("isEnabled", false, true, false, false);
      await browser.composeAction.disable(tabIDs[0]);
      await checkProperty("isEnabled", false, false, false, false);
      await browser.composeAction.enable();
      await checkProperty("isEnabled", true, false, true, true);

      await checkProperty(
        "getTitle",
        "default",
        "default",
        "default",
        "default"
      );
      await browser.composeAction.setTitle({ tabId: tabIDs[2], title: "tab2" });
      await checkProperty("getTitle", "default", "default", "default", "tab2");
      await browser.composeAction.setTitle({ title: "new" });
      await checkProperty("getTitle", "new", "new", "new", "tab2");
      await browser.composeAction.setTitle({ tabId: tabIDs[1], title: "tab1" });
      await checkProperty("getTitle", "new", "new", "tab1", "tab2");
      await browser.composeAction.setTitle({ tabId: tabIDs[2], title: null });
      await checkProperty("getTitle", "new", "new", "tab1", "new");
      await browser.composeAction.setTitle({ title: null });
      await checkProperty("getTitle", "default", "default", "tab1", "default");
      await browser.composeAction.setTitle({ tabId: tabIDs[1], title: null });
      await checkProperty(
        "getTitle",
        "default",
        "default",
        "default",
        "default"
      );

      await browser.tabs.remove(tabIDs[0]);
      await browser.tabs.remove(tabIDs[1]);
      await browser.tabs.remove(tabIDs[2]);
      browser.test.notifyPass("finished");
    },
    manifest: {
      applications: {
        gecko: {
          id: "test1@mochi.test",
        },
      },
      compose_action: {
        default_title: "default",
      },
    },
  });

  extension.onMessage("checkProperty", async (property, expected) => {
    let composeWindows = [...Services.wm.getEnumerator("msgcompose")];
    is(composeWindows.length, 3);

    for (let i = 0; i < 3; i++) {
      let button = composeWindows[i].document.getElementById(
        "test1_mochi_test-composeAction-toolbarbutton"
      );
      switch (property) {
        case "isEnabled":
          is(button.disabled, !expected[i], `button ${i} enabled state`);
          break;
        case "getTitle":
          is(button.getAttribute("label"), expected[i], `button ${i} label`);
          break;
      }
    }

    extension.sendMessage();
  });

  await extension.startup();
  await extension.awaitFinish("finished");
  await extension.unload();
});