/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMailboxService_h___
#define nsMailboxService_h___

#include "nscore.h"
#include "nsISupports.h"

#include "nsIMailboxService.h"
#include "nsIMsgFolder.h"
#include "nsIMsgMessageService.h"
#include "nsIMsgWindow.h"
#include "nsIMailboxUrl.h"
#include "nsIURI.h"
#include "nsIUrlListener.h"
#include "nsIProtocolHandler.h"

class nsMailboxService : public nsIMailboxService,
                         public nsIMsgMessageService,
                         public nsIMsgMessageFetchPartService,
                         public nsIProtocolHandler {
 public:
  nsMailboxService();
  nsresult NewURI(const nsACString &aSpec, const char *aOriginCharset,
                  nsIURI *aBaseURI, nsIURI **_retval);

  NS_DECL_ISUPPORTS
  NS_DECL_NSIMAILBOXSERVICE
  NS_DECL_NSIMSGMESSAGESERVICE
  NS_DECL_NSIMSGMESSAGEFETCHPARTSERVICE
  NS_DECL_NSIPROTOCOLHANDLER

 protected:
  virtual ~nsMailboxService();
  bool mPrintingOperation;

  // helper functions used by the service
  nsresult PrepareMessageUrl(const char *aSrcMsgMailboxURI,
                             nsIUrlListener *aUrlListener,
                             nsMailboxAction aMailboxAction,
                             nsIMailboxUrl **aMailboxUrl,
                             nsIMsgWindow *msgWindow);

  nsresult RunMailboxUrl(nsIURI *aMailboxUrl,
                         nsISupports *aDisplayConsumer = nullptr);

  nsresult FetchMessage(
      const char *aMessageURI, nsISupports *aDisplayConsumer,
      nsIMsgWindow *aMsgWindow, nsIUrlListener *aUrlListener,
      const char *aFileName, /* only used by open attachment */
      nsMailboxAction mailboxAction, const char *aCharsetOverride,
      nsIURI **aURL);

  nsresult DecomposeMailboxURI(const char *aMessageURI, nsIMsgFolder **aFolder,
                               nsMsgKey *aMsgKey);
};

#endif /* nsMailboxService_h___ */
