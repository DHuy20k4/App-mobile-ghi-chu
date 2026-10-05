export const authService = {
  loginUser: async (data: any) => {
    return { token: 'mock-jwt-token', user: { email: data.email } };
  },
  registerUser: async (data: any) => {
    return { token: 'mock-jwt-token', user: { email: data.email } };
  },
};
