import { useEffect, useState } from 'react';

class LandingStore {
  private observers: Set<() => void> = new Set();
  private _state = {
    showAuthModal: false,
    authMode: 'register' as 'login' | 'register',
    isLoading: false,
    user: null as any
  };

  // Subscribe to state changes
  subscribe(callback: () => void): () => void {
    this.observers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.observers.delete(callback);
    };
  }

  // Notify all observers
  private notify() {
    this.observers.forEach(callback => callback());
  }

  // Getters
  get state() {
    return { ...this._state };
  }

  get showAuthModal() {
    return this._state.showAuthModal;
  }

  get authMode() {
    return this._state.authMode;
  }

  get isLoading() {
    return this._state.isLoading;
  }

  get user() {
    return this._state.user;
  }

  // Actions
  openLoginModal() {
    this._state.authMode = 'login';
    this._state.showAuthModal = true;
    this.notify();
  }

  openRegisterModal() {
    this._state.authMode = 'register';
    this._state.showAuthModal = true;
    this.notify();
  }

  closeModal() {
    this._state.showAuthModal = false;
    this._state.isLoading = false;
    this.notify();
  }

  setAuthMode(mode: 'login' | 'register') {
    this._state.authMode = mode;
    this.notify();
  }

  setIsLoading(loading: boolean) {
    this._state.isLoading = loading;
    this.notify();
  }

  setUser(user: any) {
    this._state.user = user;
    this.notify();
  }

  // Batch updates to avoid multiple notifications
  updateState(updates: Partial<typeof this._state>) {
    Object.assign(this._state, updates);
    this.notify();
  }
}

// Singleton instance
export const landingStore = new LandingStore();

// React Hook to observe the store
export function useObserveLandingStore() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const unsubscribe = landingStore.subscribe(() => {
      forceUpdate({}); // Force re-render when store changes
    });
    
    return unsubscribe; // Cleanup on unmount
  }, []);
  
  return landingStore;
}

// Alternative: Observe specific properties only
export function useObserveProperty<K extends keyof LandingStore['state']>(
  property: K
): LandingStore['state'][K] {
  const [value, setValue] = useState(landingStore.state[property]);
  
  useEffect(() => {
    const unsubscribe = landingStore.subscribe(() => {
      const newValue = landingStore.state[property];
      setValue(newValue);
    });
    
    return unsubscribe;
  }, [property]);
  
  return value;
}