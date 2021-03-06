#filter dumbComments emptyLines substitution

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

//
// default prefs for mdn
//

// false: Use global true: Use custom
pref("mail.identity.default.use_custom_prefs", false);
pref("mail.identity.default.request_return_receipt_on", false);
// 0: Inbox/filter 1: Sent folder
pref("mail.server.default.incorporate_return_receipt", 0);
// false: Never return receipts true: Return some receipts
pref("mail.server.default.mdn_report_enabled", true);
// 0: Never 1: Always 2: Ask me 3: Denial
pref("mail.server.default.mdn_not_in_to_cc", 2);
pref("mail.server.default.mdn_outside_domain", 2);
pref("mail.server.default.mdn_other", 2);
// return receipt header type - 0: MDN-DNT 1: RRT 2: Both
pref("mail.identity.default.request_receipt_header_type", 0);

pref("mail.server.default.mdn_report_enabled", true);
