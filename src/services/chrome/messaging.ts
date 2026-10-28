export enum MessageType {
  GET_BLOCKLISTS = "GET_BLOCKLISTS",
  ADD_BLOCKLISTS = "ADD_BLOCKLISTS",
  REMOVE_BLOCKLISTS = "REMOVE_BLOCKLISTS",
  TOGGLE_BLOCKLISTS = "TOGGLE_BLOCKLISTS",
  SET_BLOCKLIST_ENABLED = "SET_BLOCKLIST_ENABLED",
  BLOCKLITS_UPDATED = "BLOCKLITS_UPDATED",
  CHECK_BLOCKLISTS_UPDATE = "CHECK_BLOCKLISTS_UPDATE",
}

export interface Message<T> {
  type: MessageType;
  payload: T;
}

export async function sendMessage<T>(message: Message<T>) {
  return chrome.runtime.sendMessage(message);
}
