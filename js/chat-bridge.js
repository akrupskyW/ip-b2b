/**
 * Shared chat bridge — one setChat / pushChat for every board that
 * narrates into the docked WISEcodeAI chat.
 *
 * Each flow calls createChatBridge() so instances stay isolated (two
 * boards on one page cannot overwrite each other's handle). Named
 * exports like setTeamChat stay as aliases of setChat.
 *
 * pushChat(html) streams an assistant reply.
 * pushChat(userLabel, replyHtml) also posts the "you" line first
 * (GRAS / dashboard style).
 */

export function createChatBridge() {
  let chatApi = null;

  function setChat(api) { chatApi = api; }
  function getChat() { return chatApi; }

  function pushChat(htmlOrUser, replyHtml) {
    if (!chatApi) return;
    chatApi.hideWelcome?.();
    if (replyHtml !== undefined) {
      if (htmlOrUser) chatApi.addUser(htmlOrUser);
      if (replyHtml) (chatApi.respond || chatApi.addWISEcodeAI)(replyHtml);
      return;
    }
    if (htmlOrUser) (chatApi.respond || chatApi.addWISEcodeAI)(htmlOrUser);
  }

  return { setChat, getChat, pushChat };
}

if (typeof window !== 'undefined') window.WiseChatBridge = { create: createChatBridge };
