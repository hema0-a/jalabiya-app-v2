/* ============================================================
   events.js - Event Bus (V2)
   
   نظام للتواصل بين المكونات بدون اعتماد مباشر
   ============================================================ */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
    return () => this.off(event, handler);
  }
  
  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
  
  off(event, handler) {
    if (!this.listeners.has(event)) return;
    const handlers = this.listeners.get(event);
    const idx = handlers.indexOf(handler);
    if (idx > -1) handlers.splice(idx, 1);
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Event handler error [${event}]:`, e);
        }
      });
    }
  }
  
  clear() {
    this.listeners.clear();
  }
}

export const events = new EventBus();

export const EVENTS = {
  DB_LOADED: 'db:loaded',
  DB_SAVED: 'db:saved',
  
  CUSTOMER_ADDED: 'customer:added',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_DELETED: 'customer:deleted',
  
  ORDER_ADDED: 'order:added',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  ORDER_DELIVERED: 'order:delivered',
  
  PAYMENT_ADDED: 'payment:added',
  
  PAGE_CHANGED: 'page:changed',
  
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',
  TOAST_SHOWN: 'toast:shown',
  
  SYNC_STATUS_CHANGED: 'sync:status:changed',
};
