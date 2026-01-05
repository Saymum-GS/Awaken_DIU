// Save token to localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Save user info
export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Get user info
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!getToken();
};

// Check if user has a specific role
export const hasRole = (role) => {
  const user = getUser();
  return user && user.role === role;
};

// Logout (clear everything)
export const logout = () => {
  removeToken();
  localStorage.removeItem('user');
};
