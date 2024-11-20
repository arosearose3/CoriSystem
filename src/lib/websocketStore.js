// lib/stores/websocketStore.js
import { writable } from 'svelte/store';

function createWebSocketStore() {
  const { subscribe, set, update } = writable({
    messages: [],
    unreadCount: 0,
    notifications: []
  });

  let ws;

  function init() {
    ws = new WebSocket(`wss://${window.location.host}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      update(state => {
        switch(data.type) {
          case 'newMessage':
            return {
              ...state,
              messages: [data.message, ...state.messages],
              unreadCount: state.unreadCount + 1
            };
          // Handle other notification types
          default:
            return state;
        }
      });
    };

    ws.onclose = () => {
      setTimeout(init, 3000);
    };
  }

  function cleanup() {
    if (ws) ws.close();
  }

  return {
    subscribe,
    init,
    cleanup
  };
}

export const wsStore = createWebSocketStore();