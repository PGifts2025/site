// Mock authentication system for development/demo purposes
// This simulates Supabase auth when real credentials aren't available

class MockAuth {
  constructor() {
    this.user = JSON.parse(localStorage.getItem('mockUser')) || null;
    this.listeners = [];
  }

  onAuthStateChange(callback) {
    this.listeners.push(callback);
    // Call immediately with current state
    callback('SIGNED_IN', { user: this.user });
    
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter(listener => listener !== callback);
      }
    };
  }

  async signInWithPassword({ email, password }) {
    // Simple mock validation
    if (email && password.length >= 6) {
      const user = {
        id: 'mock-user-id',
        email,
        created_at: new Date().toISOString()
      };
      
      this.user = user;
      localStorage.setItem('mockUser', JSON.stringify(user));
      
      // Notify listeners
      this.listeners.forEach(callback => {
        callback('SIGNED_IN', { user });
      });
      
      return { data: { user }, error: null };
    } else {
      return { 
        data: null, 
        error: { message: 'Invalid email or password (password must be at least 6 characters)' }
      };
    }
  }

  async signUp({ email, password }) {
    // Simple mock validation
    if (email && password.length >= 6) {
      const user = {
        id: 'mock-user-id',
        email,
        created_at: new Date().toISOString()
      };
      
      this.user = user;
      localStorage.setItem('mockUser', JSON.stringify(user));
      
      // Notify listeners
      this.listeners.forEach(callback => {
        callback('SIGNED_UP', { user });
      });
      
      return { data: { user }, error: null };
    } else {
      return { 
        data: null, 
        error: { message: 'Invalid email or password (password must be at least 6 characters)' }
      };
    }
  }

  async signOut() {
    this.user = null;
    localStorage.removeItem('mockUser');
    
    // Notify listeners
    this.listeners.forEach(callback => {
      callback('SIGNED_OUT', { user: null });
    });
    
    return { error: null };
  }

  async getSession() {
    return { data: { session: this.user ? { user: this.user } : null } };
  }
}

export const createMockSupabase = () => {
  return {
    auth: new MockAuth()
  };
};
