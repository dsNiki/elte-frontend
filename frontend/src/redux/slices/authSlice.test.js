import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  registerSuccess,
  logout,
  clearError,
  initializeAuth,
} from './authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
  };

  test('should return initial state', () => {
    expect(authReducer(undefined, {})).toEqual(initialState);
  });

  describe('loginStart', () => {
    test('should set loading to true and clear error', () => {
      const previousState = {
        ...initialState,
        error: 'Previous error',
        loading: false,
      };
      const action = loginStart();
      const newState = authReducer(previousState, action);
      
      expect(newState.loading).toBe(true);
      expect(newState.error).toBe(null);
    });
  });

  describe('loginSuccess', () => {
    test('should set user, isAuthenticated to true, and clear loading and error', () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@elte.hu',
        major: 'Informatika',
      };
      const action = loginSuccess(user);
      const newState = authReducer(initialState, action);
      
      expect(newState.user).toEqual(user);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBe(null);
    });
  });

  describe('loginFailure', () => {
    test('should set error and clear loading and isAuthenticated', () => {
      const errorMessage = 'Invalid credentials';
      const action = loginFailure(errorMessage);
      const newState = authReducer(initialState, action);
      
      expect(newState.error).toBe(errorMessage);
      expect(newState.loading).toBe(false);
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe('registerSuccess', () => {
    test('should set user, isAuthenticated to true, and clear loading and error', () => {
      const user = {
        id: 1,
        name: 'New User',
        email: 'newuser@elte.hu',
        major: 'Informatika',
      };
      const action = registerSuccess(user);
      const newState = authReducer(initialState, action);
      
      expect(newState.user).toEqual(user);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBe(null);
    });
  });

  describe('logout', () => {
    test('should clear user and set isAuthenticated to false', () => {
      const previousState = {
        ...initialState,
        user: { id: 1, name: 'Test User' },
        isAuthenticated: true,
      };
      const action = logout();
      const newState = authReducer(previousState, action);
      
      expect(newState.user).toBe(null);
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.error).toBe(null);
    });
  });

  describe('clearError', () => {
    test('should clear error message', () => {
      const previousState = {
        ...initialState,
        error: 'Some error message',
      };
      const action = clearError();
      const newState = authReducer(previousState, action);
      
      expect(newState.error).toBe(null);
    });
  });

  describe('initializeAuth', () => {
    test('should set user and isAuthenticated when user is provided', () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@elte.hu',
      };
      const action = initializeAuth(user);
      const newState = authReducer(initialState, action);
      
      expect(newState.user).toEqual(user);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.initialized).toBe(true);
    });

    test('should clear user and set isAuthenticated to false when user is null', () => {
      const previousState = {
        ...initialState,
        user: { id: 1, name: 'Test User' },
        isAuthenticated: true,
      };
      const action = initializeAuth(null);
      const newState = authReducer(previousState, action);
      
      expect(newState.user).toBe(null);
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.initialized).toBe(true);
    });

    test('should mark as initialized even when user is null', () => {
      const action = initializeAuth(null);
      const newState = authReducer(initialState, action);
      
      expect(newState.initialized).toBe(true);
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe('state transitions', () => {
    test('should handle complete login flow', () => {
      let state = initialState;
      
      // Start login
      state = authReducer(state, loginStart());
      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
      
      // Login success
      const user = { id: 1, name: 'Test User', email: 'test@elte.hu' };
      state = authReducer(state, loginSuccess(user));
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(user);
      
      // Logout
      state = authReducer(state, logout());
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
    });

    test('should handle login failure flow', () => {
      let state = initialState;
      
      // Start login
      state = authReducer(state, loginStart());
      expect(state.loading).toBe(true);
      
      // Login failure
      state = authReducer(state, loginFailure('Invalid credentials'));
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      
      // Clear error
      state = authReducer(state, clearError());
      expect(state.error).toBe(null);
    });
  });
});
