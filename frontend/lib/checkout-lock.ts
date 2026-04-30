/**
 * Global Synchronous Checkout Lock
 * Used to prevent any background activity (sync, fetch, etc.) 
 * during critical checkout operations.
 */
class CheckoutLock {
  private active = false;

  lock() {
    console.log('🔒 GLOBAL LOCK ACQUIRED');
    this.active = true;
  }

  unlock() {
    console.log('🔓 GLOBAL LOCK RELEASED');
    this.active = false;
  }

  isLocked() {
    return this.active;
  }
}

export const checkoutLock = new CheckoutLock();
