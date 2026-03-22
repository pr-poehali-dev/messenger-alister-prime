const URLS = {
  auth: "https://functions.poehali.dev/678faca8-9cc3-4156-bfe0-ab13c83362f7",
  chats: "https://functions.poehali.dev/f5f1402d-14b1-4af9-8b80-b943d2b281b1",
  groups: "https://functions.poehali.dev/4d8cddb6-661f-4a58-b4db-70a51d9e0a17",
  stories: "https://functions.poehali.dev/4dd6c08f-d913-4afa-ae83-512545b319c5",
};

function getToken() {
  return localStorage.getItem("ap_token") || "";
}

async function req(base: string, path: string, method = "GET", body?: object) {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": getToken(),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${base}${path}`, opts);
  return res.json();
}

export const api = {
  // Auth
  sendCode: (phone: string) => req(URLS.auth, "/send-code", "POST", { phone }),
  verifyCode: (phone: string, code: string) => req(URLS.auth, "/verify-code", "POST", { phone, code }),
  setupProfile: (data: { username: string; display_name: string; bio?: string }) =>
    req(URLS.auth, "/setup-profile", "POST", data),
  getMe: () => req(URLS.auth, "/me", "GET"),
  updateProfile: (data: { username?: string; display_name?: string; bio?: string }) =>
    req(URLS.auth, "/profile", "PUT", data),
  searchUsers: (q: string) => req(URLS.auth, `/search?q=${encodeURIComponent(q)}`, "GET"),
  getUserProfile: (username: string) => req(URLS.auth, `/profile/${username}`, "GET"),

  // Chats
  getChats: () => req(URLS.chats, "/", "GET"),
  startChat: (username: string) => req(URLS.chats, "/start", "POST", { username }),
  getMessages: (chatId: number) => req(URLS.chats, `/${chatId}/messages`, "GET"),
  sendMessage: (chatId: number, text: string) => req(URLS.chats, `/${chatId}/messages`, "POST", { text }),

  // Groups
  getGroups: () => req(URLS.groups, "/groups/", "GET"),
  createGroup: (name: string, description: string, members: string[]) =>
    req(URLS.groups, "/groups/", "POST", { name, description, members }),
  inviteToGroup: (groupId: number, usernames: string[]) =>
    req(URLS.groups, `/groups/${groupId}/invite`, "POST", { usernames }),
  getGroupMessages: (groupId: number) => req(URLS.groups, `/groups/${groupId}/messages`, "GET"),
  sendGroupMessage: (groupId: number, text: string) =>
    req(URLS.groups, `/groups/${groupId}/messages`, "POST", { text }),
  joinGroup: (link: string) => req(URLS.groups, `/groups/join/${link}`, "POST", {}),

  // Channels
  getChannels: (mine = false) => req(URLS.groups, `/channels/?mine=${mine}`, "GET"),
  createChannel: (name: string, username: string, description: string) =>
    req(URLS.groups, "/channels/", "POST", { name, username, description }),
  subscribeChannel: (channelId: number) => req(URLS.groups, `/channels/${channelId}/subscribe`, "POST", {}),
  getChannelPosts: (channelId: number) => req(URLS.groups, `/channels/${channelId}/posts`, "GET"),
  publishPost: (channelId: number, text: string) =>
    req(URLS.groups, `/channels/${channelId}/posts`, "POST", { text }),

  // Stories
  getStories: () => req(URLS.stories, "/", "GET"),
  publishStory: (text: string, image_url?: string) =>
    req(URLS.stories, "/", "POST", { text, image_url: image_url || "" }),
  viewStory: (storyId: number) => req(URLS.stories, `/${storyId}/view`, "POST", {}),
};
