import { supabase } from './supabase-config';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  photoURL?: string;
}

class AuthService {
  /**
   * Register a new user with email, password and username
   */
  async register(email: string, password: string, username: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error('User registration failed');
      }
      
      return {
        id: data.user.id,
        username: data.user.user_metadata.username || 'Anonymous',
        email: data.user.email || '',
        photoURL: data.user.user_metadata.avatar_url
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }
  
  /**
   * Login an existing user with email and password
   */
  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error('Login failed');
      }
      
      return {
        id: data.user.id,
        username: data.user.user_metadata.username || 'Anonymous',
        email: data.user.email || '',
        photoURL: data.user.user_metadata.avatar_url
      };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
  
  /**
   * Get the current user's profile or null if not logged in
   * This is now an async method that returns a Promise
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (!data.user) return null;
      
      return {
        id: data.user.id,
        username: data.user.user_metadata.username || 'Anonymous',
        email: data.user.email || '',
        photoURL: data.user.user_metadata.avatar_url
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const userProfile: UserProfile = {
          id: user.id,
          username: user.user_metadata.username || 'Anonymous',
          email: user.email || '',
          photoURL: user.user_metadata.avatar_url
        };
        callback(userProfile);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();
export default authService; 